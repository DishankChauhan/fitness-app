use anchor_lang::prelude::*;
use anchor_lang::solana_program::system_program;

declare_id!("your_program_id_here");

#[program]
pub mod accountability_program {
    use super::*;

    pub fn initialize_challenge(
        ctx: Context<InitializeChallenge>,
        challenge_id: String,
        stake_amount: u64,
    ) -> Result<()> {
        let challenge = &mut ctx.accounts.challenge;
        challenge.authority = ctx.accounts.authority.key();
        challenge.challenge_id = challenge_id;
        challenge.total_stake = stake_amount;
        challenge.is_active = true;
        Ok(())
    }

    pub fn stake_tokens(
        ctx: Context<StakeTokens>,
        amount: u64
    ) -> Result<()> {
        require!(ctx.accounts.challenge.is_active, CustomError::ChallengeInactive);
        
        // Transfer tokens from participant to challenge account
        let transfer_ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.participant.key(),
            &ctx.accounts.challenge.key(),
            amount
        );
        
        anchor_lang::solana_program::program::invoke(
            &transfer_ix,
            &[
                ctx.accounts.participant.to_account_info(),
                ctx.accounts.challenge.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        Ok(())
    }

    pub fn distribute_reward(
        ctx: Context<DistributeReward>,
        amount: u64
    ) -> Result<()> {
        require!(
            ctx.accounts.authority.key() == ctx.accounts.challenge.authority,
            CustomError::Unauthorized
        );

        // Transfer reward to winner
        **ctx.accounts.challenge.to_account_info().try_borrow_mut_lamports()? -= amount;
        **ctx.accounts.winner.to_account_info().try_borrow_mut_lamports()? += amount;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeChallenge<'info> {
    #[account(
        init,
        payer = authority,
        space = 1024
    )]
    pub challenge: Account<'info, Challenge>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct StakeTokens<'info> {
    #[account(mut)]
    pub challenge: Account<'info, Challenge>,
    #[account(mut)]
    pub participant: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DistributeReward<'info> {
    #[account(mut)]
    pub challenge: Account<'info, Challenge>,
    #[account(mut)]
    pub winner: AccountInfo<'info>,
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Challenge {
    pub authority: Pubkey,
    pub challenge_id: String,
    pub total_stake: u64,
    pub is_active: bool,
}

#[error_code]
pub enum CustomError {
    #[msg("Challenge is not active")]
    ChallengeInactive,
    #[msg("Unauthorized to perform this action")]
    Unauthorized,
} 