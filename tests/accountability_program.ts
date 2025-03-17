import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { AccountabilityProgram } from "../target/types/accountability_program";
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { expect } from "chai";

describe("accountability_program", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.AccountabilityProgram as Program<AccountabilityProgram>;
  
  let challengeAccount: anchor.web3.Keypair;
  let participant: anchor.web3.Keypair;
  let winner: anchor.web3.Keypair;

  before(async () => {
    challengeAccount = anchor.web3.Keypair.generate();
    participant = anchor.web3.Keypair.generate();
    winner = anchor.web3.Keypair.generate();

    // Airdrop SOL to participant for testing
    const signature = await provider.connection.requestAirdrop(
      participant.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(signature);
  });

  it("Initializes a challenge", async () => {
    await program.methods
      .initializeChallenge("test-challenge", new anchor.BN(1 * LAMPORTS_PER_SOL))
      .accounts({
        challenge: challengeAccount.publicKey,
        authority: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([challengeAccount])
      .rpc();

    const account = await program.account.challenge.fetch(challengeAccount.publicKey);
    expect(account.challengeId).to.equal("test-challenge");
    expect(account.isActive).to.equal(true);
  });

  it("Stakes tokens in a challenge", async () => {
    const stakeAmount = new anchor.BN(0.5 * LAMPORTS_PER_SOL);
    
    const initialBalance = await provider.connection.getBalance(challengeAccount.publicKey);

    await program.methods
      .stakeTokens(stakeAmount)
      .accounts({
        challenge: challengeAccount.publicKey,
        participant: participant.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([participant])
      .rpc();

    const finalBalance = await provider.connection.getBalance(challengeAccount.publicKey);
    expect(finalBalance - initialBalance).to.equal(stakeAmount.toNumber());
  });

  it("Distributes rewards", async () => {
    const rewardAmount = new anchor.BN(0.3 * LAMPORTS_PER_SOL);
    
    const initialWinnerBalance = await provider.connection.getBalance(winner.publicKey);

    await program.methods
      .distributeReward(rewardAmount)
      .accounts({
        challenge: challengeAccount.publicKey,
        winner: winner.publicKey,
        authority: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const finalWinnerBalance = await provider.connection.getBalance(winner.publicKey);
    expect(finalWinnerBalance - initialWinnerBalance).to.equal(rewardAmount.toNumber());
  });
}); 

function before(arg0: () => Promise<void>) {
  throw new Error("Function not implemented.");
}
