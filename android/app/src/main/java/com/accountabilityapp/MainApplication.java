package com.accountabilityapp;

import android.app.Application;
import com.facebook.react.ReactApplication;
import com.facebook.react.ReactPackage;
import com.facebook.react.shell.MainReactPackage;
import com.facebook.react.shell.PackageList;
import com.healthconnect.HealthConnectPackage;
import java.util.Arrays;
import java.util.List;

public class MainApplication extends Application implements ReactApplication {

  @Override
  protected List<ReactPackage> getPackages() {
    List<ReactPackage> packages = new PackageList(this).getPackages();
    packages.add(new HealthConnectPackage());
    return packages;
  }

  @Override
  public ReactPackage createPackage() {
    return new MainReactPackage();
  }
} 