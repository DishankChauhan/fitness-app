import Foundation
import HealthKit
import React

@objc(HealthKitModule)
class HealthKitModule: NSObject {
  private let healthStore = HKHealthStore()
  private let requiredTypes: Set<HKSampleType> = [
    HKQuantityType.quantityType(forIdentifier: .stepCount)!,
    HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned)!,
    HKQuantityType.quantityType(forIdentifier: .heartRate)!,
    HKCategoryType.categoryType(forIdentifier: .sleepAnalysis)!
  ]
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return true
  }
  
  @objc
  func isAvailable(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    resolve(HKHealthStore.isHealthDataAvailable())
  }
  
  @objc
  func requestPermissions(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard HKHealthStore.isHealthDataAvailable() else {
      reject("ERROR", "HealthKit is not available", nil)
      return
    }
    
    healthStore.requestAuthorization(toShare: nil, read: requiredTypes) { success, error in
      if let error = error {
        reject("ERROR", error.localizedDescription, error)
        return
      }
      resolve(success)
    }
  }
  
  @objc
  func getHealthData(_ startTime: Double, endTime: Double, resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    let startDate = Date(timeIntervalSince1970: startTime / 1000)
    let endDate = Date(timeIntervalSince1970: endTime / 1000)
    let predicate = HKQuery.predicateForSamples(withStart: startDate, end: endDate, options: .strictStartDate)
    
    let group = DispatchGroup()
    var result: [String: Any] = [:]
    var queryError: Error?
    
    // Get steps
    group.enter()
    if let stepsType = HKQuantityType.quantityType(forIdentifier: .stepCount) {
      let query = HKStatisticsQuery(quantityType: stepsType,
                                  quantitySamplePredicate: predicate,
                                  options: .cumulativeSum) { _, statistics, error in
        if let error = error {
          queryError = error
        } else if let sum = statistics?.sumQuantity() {
          result["steps"] = sum.doubleValue(for: HKUnit.count())
        }
        group.leave()
      }
      healthStore.execute(query)
    }
    
    // Get active minutes
    group.enter()
    if let activeType = HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned) {
      let query = HKStatisticsQuery(quantityType: activeType,
                                  quantitySamplePredicate: predicate,
                                  options: .cumulativeSum) { _, statistics, error in
        if let error = error {
          queryError = error
        } else if let sum = statistics?.sumQuantity() {
          let activeMinutes = sum.doubleValue(for: HKUnit.kilocalorie()) / 7.0 // Rough estimate
          result["activeMinutes"] = activeMinutes
        }
        group.leave()
      }
      healthStore.execute(query)
    }
    
    // Get heart rate
    group.enter()
    if let heartRateType = HKQuantityType.quantityType(forIdentifier: .heartRate) {
      let query = HKStatisticsQuery(quantityType: heartRateType,
                                  quantitySamplePredicate: predicate,
                                  options: .discreteAverage) { _, statistics, error in
        if let error = error {
          queryError = error
        } else if let avg = statistics?.averageQuantity() {
          result["heartRate"] = avg.doubleValue(for: HKUnit.count().unitDivided(by: HKUnit.minute()))
        }
        group.leave()
      }
      healthStore.execute(query)
    }
    
    // Get sleep hours
    group.enter()
    if let sleepType = HKCategoryType.categoryType(forIdentifier: .sleepAnalysis) {
      let query = HKSampleQuery(sampleType: sleepType,
                              predicate: predicate,
                              limit: HKObjectQueryNoLimit,
                              sortDescriptors: nil) { _, samples, error in
        if let error = error {
          queryError = error
        } else if let sleepSamples = samples as? [HKCategorySample] {
          let totalSleepHours = sleepSamples.reduce(0.0) { total, sample in
            return total + sample.endDate.timeIntervalSince(sample.startDate) / 3600.0
          }
          result["sleepHours"] = totalSleepHours
        }
        group.leave()
      }
      healthStore.execute(query)
    }
    
    group.notify(queue: .main) {
      if let error = queryError {
        reject("ERROR", error.localizedDescription, error)
      } else {
        resolve(result)
      }
    }
  }
} 