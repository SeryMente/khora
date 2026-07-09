#Requires AutoHotkey v2.0
#SingleInstance Force
; ============================================================================
;  Cazagangas - overlay.ahk v1.0  (AutoHotkey v2)
;  Indicador flotante SIEMPRE visible del estado de la cosecha, para que un
;  cerebro TDAH tenga el recordatorio a la vista sin depender de la pestana.
;
;  Como sabe el estado: humano.js pone marcadores en el TITULO de la pestana
;  de Facebook:
;     Chr(0x25B6) Chr(0x25B6) + "CZG"   -> COSECHANDO (ventana enfocada)
;     Chr(0x23F8) Chr(0x23F8) + "CZG"   -> PAUSA (pestana activa, ventana no enfocada)
;  Este script recorre los titulos de TODAS las ventanas. Si ve el marcador de
;  correr -> verde. Si ve el de pausa -> naranja. Si NO ve ninguno pero hubo
;  actividad hace < 12 s -> naranja PAUSA (perdiste el foco: la cosecha esta
;  detenida por diseno). Si no hay nada -> gris inactivo.
;
;  Hotkeys:  Win+Alt+C = ocultar/mostrar overlay    Win+Alt+X = salir
;  Se migra junto con la carpeta de la extension. Requiere AutoHotkey v2 instalado.
; ============================================================================

SetTitleMatchMode(2)   ; coincidencia por subcadena

MARK_RUN := Chr(0x25B6) . Chr(0x25B6) . "CZG"
MARK_PAUSE := Chr(0x23F8) . Chr(0x23F8) . "CZG"

estado := "inactivo"
ultimaActividad := 0
visible := true

g := Gui("+AlwaysOnTop -Caption +ToolWindow +E0x08000000")  ; E0x08000000 = WS_EX_NOACTIVATE
g.MarginX := 14
g.MarginY := 8
g.SetFont("s11 Bold", "Segoe UI")
txt := g.Add("Text", "w330 Center cFFFFFF", "Cazagangas: inactivo")
g.BackColor := "404040"
g.Show("NoActivate AutoSize")
PosicionarEsquina(g)

SetTimer(Refrescar, 400)
Return

Refrescar(*) {
    global estado, ultimaActividad, MARK_RUN, MARK_PAUSE
    nuevo := DetectarEstado(MARK_RUN, MARK_PAUSE)
    if (nuevo = "corriendo")
        ultimaActividad := A_TickCount
    else if (nuevo = "inactivo" and (A_TickCount - ultimaActividad) < 12000)
        nuevo := "pausado"   ; vio actividad hace poco => pausado por perdida de foco
    if (nuevo != estado) {
        estado := nuevo
        Pintar(estado)
        if (estado = "pausado")
            TrayTip("Cosecha EN PAUSA - vuelve a la pestana de Facebook para continuar.", "Cazagangas")
        else if (estado = "corriendo")
            TrayTip("Cosechando...", "Cazagangas")
    }
}

DetectarEstado(mr, mp) {
    for i, hwnd in WinGetList() {
        t := ""
        try t := WinGetTitle("ahk_id " . hwnd)
        if (InStr(t, mr))
            return "corriendo"
    }
    for i, hwnd in WinGetList() {
        t := ""
        try t := WinGetTitle("ahk_id " . hwnd)
        if (InStr(t, mp))
            return "pausado"
    }
    return "inactivo"
}

Pintar(e) {
    global txt, g
    if (e = "corriendo") {
        g.BackColor := "1F6F43"
        txt.Value := "Cazagangas: COSECHANDO"
    } else if (e = "pausado") {
        g.BackColor := "B5791F"
        txt.Value := "Cazagangas: EN PAUSA - vuelve a la pestana"
    } else {
        g.BackColor := "404040"
        txt.Value := "Cazagangas: inactivo"
    }
    g.Show("NoActivate")
}

PosicionarEsquina(gui) {
    gui.GetPos(&x, &y, &w, &h)
    gui.Move(A_ScreenWidth - w - 24, 24)
}

#!c:: {
    global g, visible
    visible := !visible
    if (visible)
        g.Show("NoActivate")
    else
        g.Hide()
}

#!x:: ExitApp()
