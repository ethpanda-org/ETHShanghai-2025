// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
  // // This should be called as early in the execution of the app as possible
  // #[cfg(debug_assertions)] // only enable instrumentation in development builds
  // let devtools = tauri_plugin_devtools::init();

  // let mut builder = tauri::Builder::default();

  // #[cfg(debug_assertions)]
  // {
  //     builder = builder.plugin(devtools);
  // }

  // builder
  //     .run(tauri::generate_context!())
  //     .expect("error while running tauri application");
    
  app_lib::run();
}
