#![windows_subsystem = "windows"]

use std::env;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::ptr;
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::thread;

type HWND = *mut std::ffi::c_void;
type HINSTANCE = *mut std::ffi::c_void;
type HMENU = *mut std::ffi::c_void;
type HICON = *mut std::ffi::c_void;
type HCURSOR = *mut std::ffi::c_void;
type HBRUSH = *mut std::ffi::c_void;
type HFONT = *mut std::ffi::c_void;
type HDC = *mut std::ffi::c_void;
type HBITMAP = *mut std::ffi::c_void;
type LRESULT = isize;
type WPARAM = usize;
type LPARAM = isize;
type UINT = u32;
type BOOL = i32;
type WNDPROC = unsafe extern "system" fn(HWND, UINT, WPARAM, LPARAM) -> LRESULT;

const WS_OVERLAPPED: u32 = 0x00000000;
const WS_CAPTION: u32 = 0x00C00000;
const WS_SYSMENU: u32 = 0x00080000;

const WM_DESTROY: UINT = 0x0002;
const WM_PAINT: UINT = 0x000F;
const WM_CLOSE: UINT = 0x0010;
const WM_ERASEBKGND: UINT = 0x0014;
const WM_TIMER: UINT = 0x0113;
const WM_SETICON: UINT = 0x0080;

const SRCCOPY: u32 = 0x00CC0020;
const TRANSPARENT: i32 = 1;
const DI_NORMAL: u32 = 0x0003;

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
struct RECT {
    left: i32,
    top: i32,
    right: i32,
    bottom: i32,
}

#[repr(C)]
struct PAINTSTRUCT {
    hdc: HDC,
    f_erase: BOOL,
    rc_paint: RECT,
    f_restore: BOOL,
    f_inc_update: BOOL,
    rgb_reserved: [u8; 32],
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
    fn LoadIconW(h_instance: HINSTANCE, lp_icon_name: *const u16) -> HICON;
    fn BeginPaint(h_wnd: HWND, lp_paint: *mut PAINTSTRUCT) -> HDC;
    fn EndPaint(h_wnd: HWND, lp_paint: *const PAINTSTRUCT) -> BOOL;
    fn InvalidateRect(h_wnd: HWND, lp_rect: *const RECT, b_erase: BOOL) -> BOOL;
    fn SetTimer(h_wnd: HWND, n_id_event: usize, u_elapse: UINT, lp_timer_func: Option<unsafe extern "system" fn(HWND, UINT, usize, u32)>) -> usize;
    fn KillTimer(h_wnd: HWND, u_id_event: usize) -> BOOL;
    fn FillRect(h_dc: HDC, lprc: *const RECT, hbr: HBRUSH) -> i32;
    fn DrawIconEx(h_dc: HDC, x_left: i32, y_top: i32, h_icon: HICON, cx_width: i32, cy_width: i32, istep_if_ani_cur: UINT, hbr_flicker_free_draw: HBRUSH, di_flags: UINT) -> BOOL;
    fn GetClientRect(h_wnd: HWND, lp_rect: *mut RECT) -> BOOL;
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
    fn CreateCompatibleDC(hdc: HDC) -> HDC;
    fn CreateCompatibleBitmap(hdc: HDC, cx: i32, cy: i32) -> HBITMAP;
    fn SelectObject(hdc: HDC, h: *mut std::ffi::c_void) -> *mut std::ffi::c_void;
    fn DeleteDC(hdc: HDC) -> BOOL;
    fn DeleteObject(ho: *mut std::ffi::c_void) -> BOOL;
    fn BitBlt(hdc: HDC, x: i32, y: i32, cx: i32, cy: i32, hdc_src: HDC, x1: i32, y1: i32, rop: u32) -> BOOL;
    fn SetTextColor(hdc: HDC, color: u32) -> u32;
    fn SetBkMode(hdc: HDC, mode: i32) -> i32;
    fn TextOutW(hdc: HDC, x: i32, y: i32, lp_string: *const u16, c: i32) -> BOOL;
    fn CreateSolidBrush(color: u32) -> HBRUSH;
}

#[link(name = "dwmapi")]
extern "system" {
    fn DwmSetWindowAttribute(
        h_wnd: HWND,
        dw_attribute: u32,
        pv_attribute: *const std::ffi::c_void,
        cb_attribute: u32,
    ) -> i32;
}

fn rgb(r: u8, g: u8, b: u8) -> u32 {
    (r as u32) | ((g as u32) << 8) | ((b as u32) << 16)
}

fn to_wide(s: &str) -> Vec<u16> {
    s.encode_utf16().chain(std::iter::once(0)).collect()
}

static PROGRESS_PCT: AtomicU32 = AtomicU32::new(5);
static IS_COMPLETED: AtomicBool = AtomicBool::new(false);

static mut G_APP_ICON: HICON = ptr::null_mut();
static mut G_FONT_TITLE: HFONT = ptr::null_mut();
static mut G_FONT_SUBTITLE: HFONT = ptr::null_mut();
static mut G_FONT_STATUS: HFONT = ptr::null_mut();
static mut G_FONT_BADGE: HFONT = ptr::null_mut();

unsafe extern "system" fn window_proc(
    hwnd: HWND,
    msg: UINT,
    wparam: WPARAM,
    lparam: LPARAM,
) -> LRESULT {
    match msg {
        WM_ERASEBKGND => 1,
        WM_TIMER => {
            let current = PROGRESS_PCT.load(Ordering::Relaxed);
            let done = IS_COMPLETED.load(Ordering::Relaxed);

            if done {
                if current < 100 {
                    PROGRESS_PCT.store(100, Ordering::Relaxed);
                    InvalidateRect(hwnd, ptr::null(), 0);
                }
            } else if current < 92 {
                PROGRESS_PCT.store(current + 1, Ordering::Relaxed);
                InvalidateRect(hwnd, ptr::null(), 0);
            }
            0
        }
        WM_PAINT => {
            let mut ps: PAINTSTRUCT = std::mem::zeroed();
            let hdc = BeginPaint(hwnd, &mut ps);

            let mut rect: RECT = std::mem::zeroed();
            GetClientRect(hwnd, &mut rect);
            let w = rect.right - rect.left;
            let h = rect.bottom - rect.top;

            // Double buffering
            let mem_dc = CreateCompatibleDC(hdc);
            let mem_bmp = CreateCompatibleBitmap(hdc, w, h);
            let old_bmp = SelectObject(mem_dc, mem_bmp as _);

            // Dark Background (#0b0f17)
            let bg_brush = CreateSolidBrush(rgb(11, 15, 23));
            FillRect(mem_dc, &rect, bg_brush);
            DeleteObject(bg_brush as _);

            SetBkMode(mem_dc, TRANSPARENT);

            // Draw Official App Icon (60x60)
            if !G_APP_ICON.is_null() {
                DrawIconEx(mem_dc, 28, 26, G_APP_ICON, 60, 60, 0, ptr::null_mut(), DI_NORMAL);
            }

            // Title "IDE Gestor"
            SelectObject(mem_dc, G_FONT_TITLE as _);
            SetTextColor(mem_dc, rgb(255, 255, 255));
            let title = to_wide("IDE Gestor");
            TextOutW(mem_dc, 102, 24, title.as_ptr(), (title.len() - 1) as i32);

            // Badge / Subheading
            SelectObject(mem_dc, G_FONT_BADGE as _);
            SetTextColor(mem_dc, rgb(59, 130, 246)); // Vibrant blue #3b82f6
            let badge = to_wide("INSTALADOR OFICIAL • VERSÃO 0.1.5");
            TextOutW(mem_dc, 104, 56, badge.as_ptr(), (badge.len() - 1) as i32);

            // Subtitle Description
            SelectObject(mem_dc, G_FONT_SUBTITLE as _);
            SetTextColor(mem_dc, rgb(203, 213, 225)); // Slate 300
            let sub = to_wide("Instalando o aplicativo no seu computador...");
            TextOutW(mem_dc, 28, 104, sub.as_ptr(), (sub.len() - 1) as i32);

            // Progress Bar Track (#1e293b)
            let bar_x = 28;
            let bar_y = 132;
            let bar_w = w - 56;
            let bar_h = 10;

            let track_rect = RECT {
                left: bar_x,
                top: bar_y,
                right: bar_x + bar_w,
                bottom: bar_y + bar_h,
            };
            let track_brush = CreateSolidBrush(rgb(30, 41, 59));
            FillRect(mem_dc, &track_rect, track_brush);
            DeleteObject(track_brush as _);

            // Progress Bar Fill (#3b82f6 - Blue Accent)
            let pct = PROGRESS_PCT.load(Ordering::Relaxed).min(100);
            let fill_w = ((bar_w as f32) * (pct as f32 / 100.0)) as i32;
            if fill_w > 0 {
                let fill_rect = RECT {
                    left: bar_x,
                    top: bar_y,
                    right: bar_x + fill_w,
                    bottom: bar_y + bar_h,
                };
                let fill_brush = CreateSolidBrush(rgb(59, 130, 246));
                FillRect(mem_dc, &fill_rect, fill_brush);
                DeleteObject(fill_brush as _);
            }

            // Status message & Percentage below progress bar
            SelectObject(mem_dc, G_FONT_STATUS as _);
            SetTextColor(mem_dc, rgb(148, 163, 184)); // Slate 400

            let status_msg = if pct < 40 {
                to_wide("Extraindo arquivos e configurando atalhos...")
            } else if pct < 85 {
                to_wide("Registrando na inicialização e configurando bandeja...")
            } else if pct < 100 {
                to_wide("Finalizando instalação...")
            } else {
                to_wide("Pronto! Abrindo o IDE Gestor...")
            };
            TextOutW(mem_dc, 28, 150, status_msg.as_ptr(), (status_msg.len() - 1) as i32);

            // Percentage on the right
            let pct_text = to_wide(&format!("{}%", pct));
            TextOutW(mem_dc, bar_x + bar_w - 36, 150, pct_text.as_ptr(), (pct_text.len() - 1) as i32);

            // Blit buffer to screen
            BitBlt(hdc, 0, 0, w, h, mem_dc, 0, 0, SRCCOPY);

            SelectObject(mem_dc, old_bmp);
            DeleteObject(mem_bmp as _);
            DeleteDC(mem_dc);

            EndPaint(hwnd, &ps);
            0
        }
        WM_DESTROY => {
            KillTimer(hwnd, 100);
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
        let h_instance = GetModuleHandleW(ptr::null());

        // Carregar ícone oficial do IDE Gestor a partir do arquivo compilado
        G_APP_ICON = LoadIconW(h_instance, 1 as *const u16);
        if G_APP_ICON.is_null() {
            G_APP_ICON = LoadIconW(ptr::null_mut(), 32512 as *const u16); // Fallback IDC_ARROW
        }

        // Criar fontes Segoe UI modernas com alta legibilidade
        let font_family = to_wide("Segoe UI");
        G_FONT_TITLE = CreateFontW(
            26, 0, 0, 0, 700, 0, 0, 0, 1, 0, 0, 5, 0, font_family.as_ptr(),
        );
        G_FONT_BADGE = CreateFontW(
            12, 0, 0, 0, 700, 0, 0, 0, 1, 0, 0, 5, 0, font_family.as_ptr(),
        );
        G_FONT_SUBTITLE = CreateFontW(
            16, 0, 0, 0, 400, 0, 0, 0, 1, 0, 0, 5, 0, font_family.as_ptr(),
        );
        G_FONT_STATUS = CreateFontW(
            13, 0, 0, 0, 400, 0, 0, 0, 1, 0, 0, 5, 0, font_family.as_ptr(),
        );

        let class_name = to_wide("IdeGestorInstallerDarkClass");

        let wc = WNDCLASSEXW {
            cb_size: std::mem::size_of::<WNDCLASSEXW>() as UINT,
            style: 0,
            lpfn_wnd_proc: window_proc,
            cb_cls_extra: 0,
            cb_wnd_extra: 0,
            h_instance,
            h_icon: G_APP_ICON,
            h_cursor: LoadCursorW(ptr::null_mut(), 32512 as *const u16),
            hbr_background: ptr::null_mut(),
            lpsz_menu_name: ptr::null(),
            lpsz_class_name: class_name.as_ptr(),
            h_icon_sm: G_APP_ICON,
        };

        RegisterClassExW(&wc);

        let win_width = 480;
        let win_height = 220;
        let screen_w = GetSystemMetrics(0); // SM_CXSCREEN
        let screen_h = GetSystemMetrics(1); // SM_CYSCREEN
        let pos_x = (screen_w - win_width) / 2;
        let pos_y = (screen_h - win_height) / 2;

        let window_title = to_wide("IDE Gestor — Instalação");
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

        // Definir ícone da barra de títulos e da barra de tarefas explicitamente
        SendMessageW(hwnd, WM_SETICON, 0 /* ICON_SMALL */, G_APP_ICON as isize);
        SendMessageW(hwnd, WM_SETICON, 1 /* ICON_BIG */, G_APP_ICON as isize);

        // Ativar modo escuro nativo na barra de título do Windows 10/11
        let dark_mode: i32 = 1;
        DwmSetWindowAttribute(hwnd, 20 /* DWMWA_USE_IMMERSIVE_DARK_MODE */, &dark_mode as *const _ as *const _, 4);
        DwmSetWindowAttribute(hwnd, 19 /* DWMWA_USE_IMMERSIVE_DARK_MODE_BEFORE_20H1 */, &dark_mode as *const _ as *const _, 4);

        ShowWindow(hwnd, 5); // SW_SHOW
        UpdateWindow(hwnd);

        // Iniciar timer de animação da barra de progresso (a cada 30ms)
        SetTimer(hwnd, 100, 30, None);

        // Executar instalação em segundo plano
        let hwnd_raw = hwnd as usize;
        thread::spawn(move || {
            let installer_bytes = include_bytes!("../setup_payload.exe");
            let temp_installer = env::temp_dir().join("ide_gestor_installer_payload.exe");

            if let Ok(mut f) = fs::File::create(&temp_installer) {
                let _ = f.write_all(installer_bytes);
            }

            // Executar instalação silenciosa
            let _ = Command::new(&temp_installer).arg("/S").status();

            // Limpar arquivo temporário
            let _ = fs::remove_file(&temp_installer);

            // Marcar como concluído
            IS_COMPLETED.store(true, Ordering::Relaxed);
            PROGRESS_PCT.store(100, Ordering::Relaxed);

            // Aguardar 500ms para o usuário ver o 100% "Pronto! Abrindo o IDE Gestor..."
            thread::sleep(std::time::Duration::from_millis(500));

            // Abrir o aplicativo imediatamente
            if let Some(app_path) = find_installed_executable() {
                let _ = Command::new(app_path).spawn();
            }

            // Fechar janela do instalador
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
