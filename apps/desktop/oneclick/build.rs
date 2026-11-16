fn main() {
    if std::env::var("CARGO_CFG_TARGET_OS").unwrap() == "windows" {
        let mut res = winres::WindowsResource::new();
        res.set_icon("icon.ico");
        res.set("FileDescription", "IDE Gestor Instalador Rápido");
        res.set("ProductName", "IDE Gestor");
        res.set("ProductVersion", "0.1.5.0");
        res.set("FileVersion", "0.1.5.0");
        res.set("LegalCopyright", "IDE Digital");
        res.compile().unwrap();
    }
}
