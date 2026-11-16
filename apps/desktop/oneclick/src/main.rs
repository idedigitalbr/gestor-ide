#![windows_subsystem = "windows"]

use std::env;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::ptr;
use std::thread;

// Win32 Types
type HWND = *mut std::ffi::c_void;
type HINSTANCE = *mut std::ffi::c_void;
type HMENU = *mut std::ffi::c_void;
type HICON = *mut std::ffi::c_void;
type HCURSOR = *mut std::ffi::c_void;
type HBRUSH = *mut std::ffi::c_void;
type HFONT = *mut std::ffi::c_void;
type LRESULT = isize;
type WPARAM = usize;
type LPARAM = isize;
type UINT = u32;
type BOOL = i32;
type WNDPROC = unsafe extern "system" fn(HWND, UINT, WPARAM, LPARAM) -> LRESULT;

const WS_OVERLAPPED: u32 = 0x00000000;
const WS_CAPTION: u32 = 0x00C00000;
const WS_SYSMENU: u32 = 0x00080000;
const WS_CHILD: u32 = 0x40000000;
const WS_VISIBLE: u32 = 0x10000000;

const PBS_MARQUEE: u32 = 0x00000008;
const PBM_SETMARQUEE: UINT = 0x040A;
const WM_SETFONT: UINT = 0x0030;
const WM_CLOSE: UINT = 0x0010;
const WM_DESTROY: UINT = 0x0002;
const COLOR_WINDOW: u32 = 5;

const ICC_PROGRESS_CLASS: u32 = 0x00000020;

#[repr(C)]
struct WNDCLASSEXW {
    cb_size: UINT,
    style: UINT,
    lpfn_wnd_proc: WNDPROC,
    cb_cls_extra: i32,
    cb_wnd_extra: i32,
    h_instance: HINSTANCE,
    h_icon: HICON,
    h_cursor: HCURSOR,
    hbr_background: HBRUSH,
    lpsz_menu_name: *const u16,
    lpsz_class_name: *const u16,
    h_icon_sm: HICON,
}

#[repr(C)]
struct POINT {
    x: i32,
    y: i32,
}

#[repr(C)]
struct MSG {
    hwnd: HWND,
    message: UINT,
    w_param: WPARAM,
    l_param: LPARAM,
    time: u32,
    pt: POINT,
}

#[repr(C)]
struct INITCOMMONCONTROLSEX {
    dw_size: u32,
    dw_icc: u32,
}

#[link(name = "user32")]
extern "system" {
    fn GetModuleHandleW(lp_module_name: *const u16) -> HINSTANCE;
    fn RegisterClassExW(lpwcx: *const WNDCLASSEXW) -> u16;
    fn CreateWindowExW(
        dw_ex_style: u32,
        lp_class_name: *const u16,
        lp_window_name: *const u16,
        dw_style: u32,
        x: i32,
        y: i32,
        n_width: i32,
        n_height: i32,
        h_wnd_parent: HWND,
        h_menu: HMENU,
        h_instance: HINSTANCE,
        lp_param: *mut std::ffi::c_void,
    ) -> HWND;
    fn ShowWindow(h_wnd: HWND, n_cmd_show: i32) -> BOOL;
    fn UpdateWindow(h_wnd: HWND) -> BOOL;
    fn GetMessageW(lp_msg: *mut MSG, h_wnd: HWND, w_msg_filter_min: UINT, w_msg_filter_max: UINT) -> BOOL;
    fn TranslateMessage(lp_msg: *const MSG) -> BOOL;
    fn DispatchMessageW(lp_msg: *const MSG) -> LRESULT;
    fn PostQuitMessage(n_exit_code: i32);
    fn PostMessageW(h_wnd: HWND, msg: UINT, w_param: WPARAM, l_param: LPARAM) -> BOOL;
    fn SendMessageW(h_wnd: HWND, msg: UINT, w_param: WPARAM, l_param: LPARAM) -> LRESULT;
    fn DefWindowProcW(h_wnd: HWND, msg: UINT, w_param: WPARAM, l_param: LPARAM) -> LRESULT;
    fn GetSystemMetrics(n_index: i32) -> i32;
    fn LoadCursorW(h_instance: HINSTANCE, lp_cursor_name: *const u16) -> HCURSOR;
}

#[link(name = "gdi32")]
extern "system" {
    fn CreateFontW(
        c_height: i32,
        c_width: i32,
        c_escapement: i32,
        c_orientation: i32,
        c_weight: i32,
        b_italic: u32,
        b_underline: u32,
        b_strike_out: u32,
        i_char_set: u32,
        i_out_precision: u32,
        i_clip_precision: u32,
        i_quality: u32,
        i_pitch_and_family: u32,
        psz_face_name: *const u16,
    ) -> HFONT;
}

#[link(name = "comctl32")]
extern "system" {
    fn InitCommonControlsEx(picce: *const INITCOMMONCONTROLSEX) -> BOOL;
}

fn to_wide(s: &str) -> Vec<u16> {
    s.encode_utf16().chain(std::iter::once(0)).collect()
}

unsafe extern "system" fn window_proc(
    hwnd: HWND,
    msg: UINT,
    wparam: WPARAM,
    lparam: LPARAM,
) -> LRESULT {
    match msg {
        WM_DESTROY => {
            PostQuitMessage(0);
            0
        }
        _ => DefWindowProcW(hwnd, msg, wparam, lparam),
    }
}

fn find_installed_executable() -> Option<PathBuf> {
    if let Ok(local_appdata) = env::var("LOCALAPPDATA") {
        let p1 = Path::new(&local_appdata).join("IDE Gestor").join("ide-gestor.exe");
        if p1.exists() {
            return Some(p1);
        }
        let p2 = Path::new(&local_appdata).join("Programs").join("IDE Gestor").join("ide-gestor.exe");
        if p2.exists() {
            return Some(p2);
        }
    }
    if let Ok(program_files) = env::var("ProgramFiles") {
        let p3 = Path::new(&program_files).join("IDE Gestor").join("ide-gestor.exe");
        if p3.exists() {
            return Some(p3);
        }
    }
    None
}

fn main() {
    unsafe {
        let icc = INITCOMMONCONTROLSEX {
            dw_size: std::mem::size_of::<INITCOMMONCONTROLSEX>() as u32,
            dw_icc: ICC_PROGRESS_CLASS,
        };
        InitCommonControlsEx(&icc);

        let h_instance = GetModuleHandleW(ptr::null());
        let class_name = to_wide("IdeGestorInstallerClass");

        let wc = WNDCLASSEXW {
            cb_size: std::mem::size_of::<WNDCLASSEXW>() as UINT,
            style: 0,
            lpfn_wnd_proc: window_proc,
            cb_cls_extra: 0,
            cb_wnd_extra: 0,
            h_instance,
            h_icon: ptr::null_mut(),
            h_cursor: LoadCursorW(ptr::null_mut(), 32512 as *const u16), // IDC_ARROW
            hbr_background: (COLOR_WINDOW + 1) as HBRUSH,
            lpsz_menu_name: ptr::null(),
            lpsz_class_name: class_name.as_ptr(),
            h_icon_sm: ptr::null_mut(),
        };

        RegisterClassExW(&wc);

        let win_width = 460;
        let win_height = 190;
        let screen_w = GetSystemMetrics(0); // SM_CXSCREEN
        let screen_h = GetSystemMetrics(1); // SM_CYSCREEN
        let pos_x = (screen_w - win_width) / 2;
        let pos_y = (screen_h - win_height) / 2;

        let window_title = to_wide("Instalação do IDE Gestor");
        let hwnd = CreateWindowExW(
            0x00040000, // WS_EX_APPWINDOW
            class_name.as_ptr(),
            window_title.as_ptr(),
            WS_OVERLAPPED | WS_CAPTION | WS_SYSMENU,
            pos_x,
            pos_y,
            win_width,
            win_height,
            ptr::null_mut(),
            ptr::null_mut(),
            h_instance,
            ptr::null_mut(),
        );

        if hwnd.is_null() {
            return;
        }

        let font_family = to_wide("Segoe UI");
        let font_title = CreateFontW(
            22, 0, 0, 0, 700, 0, 0, 0, 1, 0, 0, 5, 0, font_family.as_ptr(),
        );
        let font_text = CreateFontW(
            15, 0, 0, 0, 400, 0, 0, 0, 1, 0, 0, 5, 0, font_family.as_ptr(),
        );

        // Header Text
        let static_class = to_wide("STATIC");
        let title_text = to_wide("Instalando o IDE Gestor...");
        let h_title = CreateWindowExW(
            0,
            static_class.as_ptr(),
            title_text.as_ptr(),
            WS_CHILD | WS_VISIBLE,
            24,
            20,
            400,
            28,
            hwnd,
            ptr::null_mut(),
            h_instance,
            ptr::null_mut(),
        );
        SendMessageW(h_title, WM_SETFONT, font_title as usize, 1);

        // Subtitle Text
        let sub_text = to_wide("Aguarde um instante, o aplicativo abrirá automaticamente...");
        let h_sub = CreateWindowExW(
            0,
            static_class.as_ptr(),
            sub_text.as_ptr(),
            WS_CHILD | WS_VISIBLE,
            24,
            55,
            410,
            22,
            hwnd,
            ptr::null_mut(),
            h_instance,
            ptr::null_mut(),
        );
        SendMessageW(h_sub, WM_SETFONT, font_text as usize, 1);

        // Progress Bar (Marquee animated)
        let prog_class = to_wide("msctls_progress32");
        let h_prog = CreateWindowExW(
            0,
            prog_class.as_ptr(),
            ptr::null(),
            WS_CHILD | WS_VISIBLE | PBS_MARQUEE,
            24,
            90,
            396,
            22,
            hwnd,
            ptr::null_mut(),
            h_instance,
            ptr::null_mut(),
        );
        SendMessageW(h_prog, PBM_SETMARQUEE, 1, 25);

        ShowWindow(hwnd, 5); // SW_SHOW
        UpdateWindow(hwnd);

        // Spawn background worker to perform installation and launch app
        let hwnd_raw = hwnd as usize;
        thread::spawn(move || {
            let installer_bytes = include_bytes!("../setup_payload.exe");
            let temp_installer = env::temp_dir().join("ide_gestor_installer_payload.exe");

            if let Ok(mut f) = fs::File::create(&temp_installer) {
                let _ = f.write_all(installer_bytes);
            }

            // Run silent installation
            let _ = Command::new(&temp_installer).arg("/S").status();

            // Clean up payload
            let _ = fs::remove_file(&temp_installer);

            // Launch app immediately
            if let Some(app_path) = find_installed_executable() {
                let _ = Command::new(app_path).spawn();
            }

            // Close dialog
            PostMessageW(hwnd_raw as HWND, WM_CLOSE, 0, 0);
        });

        // Message pump
        let mut msg: MSG = std::mem::zeroed();
        while GetMessageW(&mut msg, ptr::null_mut(), 0, 0) > 0 {
            TranslateMessage(&msg);
            DispatchMessageW(&msg);
        }
    }
}
