// Release builds are a tray application; debug builds keep console diagnostics.
#![cfg_attr(all(windows, not(debug_assertions)), windows_subsystem = "windows")]

fn main() {
    island_w_lib::run()
}
