; Quorzak: an original fixed shooter for the Intel 8080 cabinet in docs/quorzak.md.
; Assemble with `npm run rom`. Coordinates are upright screen pixels: x 0-223, y 0-255.

; ---- Hardware
INPUTS   EQU 1
SHIFTAMT EQU 2
SHIFTIN  EQU 3
SOUNDA   EQU 3
SHIFTDAT EQU 4
SOUNDB   EQU 5
VRAM     EQU $2400
STACK    EQU $2400

; ---- Public status block (read by src/game/machine.ts)
MODE     EQU $2000      ; 1 playing, 2 game over
SCORE    EQU $2001      ; BCD low, then BCD high at SCORE+1
LIVES    EQU $2003
WAVE     EQU $2004
GRIDX    EQU $2005      ; x of column 0
GRIDY    EQU $2006      ; top y of row 0 (bottom row)
UFOPTS   EQU $2007      ; UFO score / 10 while it is shown, else 0
UFOPX    EQU $2008
ALIENS   EQU $2010      ; 55 flags, index row*11+col

; ---- Private state
PX       EQU $2050      ; ship x (left)
PSTATE   EQU $2051      ; 0 alive, else explosion ticks left
SHOTON   EQU $2052
SHOTX    EQU $2053
SHOTY    EQU $2054
SHOTCNT  EQU $2055
DIR      EQU $2056      ; 0 right, 1 left
CURSOR   EQU $2057      ; next alien to move; 55 = start a pass
FRAME    EQU $2058
PDX      EQU $2059      ; this pass's x step (two's complement)
PDY      EQU $205A      ; this pass's y step
NOTE     EQU $205B
RELOAD   EQU $205C
NEXTSHOT EQU $205D
COLIDX   EQU $205E
EXTRA    EQU $205F
UFOON    EQU $2060      ; 0 none, 1 flying, 2 exploding, 3 score shown
UFOX     EQU $2061
UFODIR   EQU $2062
UFOTMR   EQU $2063      ; 16-bit
UFOTICK  EQU $2065
PULSEA   EQU $2066
PULSEB   EQU $2067
LIVECNT  EQU $2068
HIT      EQU $2069
BLITOP   EQU $206A      ; 0 draw, 1 erase, 2 test
UFOK     EQU $206B
TMPA     EQU $206C      ; 2 bytes
UFOV     EQU $206E
AEXT     EQU $206F
ASHOTS   EQU $2070      ; 3 x (on, x, y, frame)
AEX      EQU $207C
AEY      EQU $207D
SAVESP   EQU $207E      ; 2 bytes

        PUBLIC PX, PSTATE, SHOTON, SHOTX, SHOTY, SHOTCNT, CURSOR, RELOAD
        PUBLIC UFOON, UFOX, UFOTMR, AEXT, ASHOTS, LIVECNT

; ---- Vectors
        ORG 0
        DI
        LXI SP,STACK
        JMP RESET

        ORG 8           ; RST 1, scanline 96: unused
        EI
        RET

        ORG $10         ; RST 2, scanline 224: one game tick
        PUSH PSW
        PUSH B
        PUSH D
        PUSH H
        CALL TICK
        POP H
        POP D
        POP B
        POP PSW
        EI
        RET

RESET:  LXI H,$2000
.clr:   MVI M,0
        INX H
        MOV A,H
        CPI HIGH(VRAM)
        JNZ .clr
        CALL NEWGAME
        EI
.idle:  JMP .idle

NEWGAME:
        MVI A,3
        STA LIVES
        MVI A,1
        STA WAVE
        MVI A,16
        STA PX
        CALL NEWWAVE
        MVI A,1
        STA MODE
        RET

; Clears the screen and sets up the rack, shields and ground for WAVE.
NEWWAVE:
        CALL CLEARVRAM
        LXI H,ALIENS
        MVI B,55
.alive: MVI M,1
        INX H
        DCR B
        JNZ .alive
        MVI A,24
        STA GRIDX
        LDA WAVE
        DCR A
        ANI 7
        MOV E,A
        MVI D,0
        LXI H,WAVEY
        DAD D
        MOV A,M
        STA GRIDY
        XRA A
        STA DIR
        STA FRAME
        STA PDX
        STA PDY
        STA NOTE
        STA SHOTON
        STA AEXT
        STA UFOON
        STA UFOPTS
        STA ASHOTS
        STA ASHOTS+4
        STA ASHOTS+8
        MVI A,55
        STA CURSOR
        STA LIVECNT
        MVI A,48
        STA RELOAD
        LXI H,1536
        SHLD UFOTMR
        CALL DRAWSHIELDS
        CALL DRAWGROUND
        JMP DRAWGRID

; Zeroes VRAM with 3584 PUSHes; interrupts are off in every caller.
CLEARVRAM:
        LXI H,0
        DAD SP
        SHLD SAVESP
        LXI SP,$4000
        LXI B,0
        MVI E,224
.loop:  PUSH B
        PUSH B
        PUSH B
        PUSH B
        PUSH B
        PUSH B
        PUSH B
        PUSH B
        PUSH B
        PUSH B
        PUSH B
        PUSH B
        PUSH B
        PUSH B
        PUSH B
        PUSH B
        DCR E
        JNZ .loop
        LHLD SAVESP
        SPHL
        RET

; Ground: one pixel row at y 239 (bit 0 of column byte 2).
DRAWGROUND:
        LXI H,VRAM+2
        LXI D,32
        MVI B,224
.loop:  MVI M,1
        DAD D
        DCR B
        JNZ .loop
        RET

DRAWSHIELDS:
        XRA A
        STA BLITOP
        LXI H,SHIELDX
        MVI C,4
.loop:  MOV D,M
        PUSH H
        PUSH B
        PUSH D
        LXI H,SHIELD
        MVI B,20
        MVI E,192
        CALL BLIT
        POP D
        LXI H,SHIELD+20
        MVI B,20
        MVI E,200
        CALL BLIT
        POP B
        POP H
        INX H
        DCR C
        JNZ .loop
        RET

DRAWGRID:
        XRA A
        STA BLITOP
        MVI C,0
.loop:  LDA FRAME
        CALL ALIENBLIT
        INR C
        MOV A,C
        CPI 55
        JNZ .loop
        RET

; Blits an 8-row sprite. In: HL = column bytes (bit 7 = top row), B = width,
; D = x, E = top y. BLITOP: 0 OR, 1 AND NOT, 2 test (sets HIT). Clobbers all.
BLIT:   MVI A,248
        SUB E
        MOV C,A         ; C = bottom row, counted up from the screen bottom
        ANI 7
        OUT SHIFTAMT
        MOV A,D
        ANI 7
        RRC
        RRC
        RRC
        MOV E,A         ; (x & 7) << 5
        MOV A,C
        RRC
        RRC
        RRC
        ANI $1F
        ORA E
        MOV E,A
        MOV A,D
        RRC
        RRC
        RRC
        ANI $1F
        ADI HIGH(VRAM)
        MOV D,A         ; DE = VRAM byte for column x, bottom row
.col:   XRA A
        OUT SHIFTDAT
        MOV A,M
        OUT SHIFTDAT
        IN SHIFTIN
        CALL .apply
        INR E
        XRA A
        OUT SHIFTDAT
        IN SHIFTIN
        CALL .apply
        DCR E
        MOV A,E
        ADI 32
        MOV E,A
        JNC .same
        INR D
.same:  INX H
        DCR B
        JNZ .col
        RET
.apply: MOV C,A
        LDA BLITOP
        ORA A
        JZ .or
        DCR A
        JZ .erase
        LDAX D
        ANA C
        RZ
        MVI A,1
        STA HIT
        RET
.or:    LDAX D
        ORA C
        STAX D
        RET
.erase: MOV A,C
        CMA
        MOV C,A
        LDAX D
        ANA C
        STAX D
        RET

; In: C = alien index. Out: B = row, D = x, E = top y. Aliens at or after CURSOR
; have not moved this pass, so they sit one step behind GRIDX/GRIDY. Keeps C, HL.
ALIENXY:
        MOV A,C
        MVI B,0
.div:   CPI 11
        JC .rc
        SUI 11
        INR B
        JMP .div
.rc:    ADD A
        ADD A
        ADD A
        ADD A
        MOV D,A
        LDA GRIDX
        ADD D
        MOV D,A
        MOV A,B
        ADD A
        ADD A
        ADD A
        ADD A
        MOV E,A
        LDA GRIDY
        SUB E
        MOV E,A
        PUSH H
        LXI H,CURSOR
        MOV A,C
        CMP M
        JC .moved
        LDA PDX
        CMA
        INR A
        ADD D
        MOV D,A
        LDA PDY
        CMA
        INR A
        ADD E
        MOV E,A
.moved: POP H
        RET

; In: B = row, A = frame. Out: HL = 16-column sprite. Keeps BC, DE.
ALIENGFX:
        PUSH D
        ANI 1
        ADD A
        ADD A
        ADD A
        ADD A
        PUSH PSW
        MOV A,B
        ADD A
        MOV E,A
        MVI D,0
        LXI H,ROWGFX
        DAD D
        MOV E,M
        INX H
        MOV D,M
        POP PSW
        MOV L,A
        MVI H,0
        DAD D
        POP D
        RET

; Blits alien C (alive or not) at its position with frame A. Keeps C.
ALIENBLIT:
        PUSH B
        PUSH PSW
        CALL ALIENXY
        POP PSW
        CALL ALIENGFX
        MVI B,16
        CALL BLIT
        POP B
        RET

TICK:   RET

; ---- Data
WAVEY:   DB 120, 136, 144, 152, 152, 160, 160, 160
SHIELDX: DB 32, 77, 122, 167
ROWGFX:  DW DOME, DOME, TWIN, TWIN, SPIRE

        PUBLIC DOME, TWIN, SPIRE, SHIP, SHIPX, UFOGFX, UFOXGFX, AEXPLGFX
        PUBLIC SHIELD, PSHOT, BLASTGFX, BOMBGFX, FONT

; Sprites: one byte per column, bit 7 = top row.
DOME:   DB $00,$00,$1A,$3C,$6A,$6C,$FA,$FC,$FA,$6C,$6A,$3C,$1A,$00,$00,$00
        DB $00,$00,$1C,$3A,$6C,$6A,$FC,$FA,$FC,$6A,$6C,$3A,$1C,$00,$00,$00
TWIN:   DB $00,$00,$00,$72,$FC,$DA,$F0,$F8,$F0,$DA,$FC,$72,$00,$00,$00,$00
        DB $00,$00,$00,$70,$FA,$DC,$F2,$F8,$F2,$DC,$FA,$70,$00,$00,$00,$00
SPIRE:  DB $00,$00,$00,$00,$1A,$3D,$68,$FC,$68,$3D,$1A,$00,$00,$00,$00,$00
        DB $00,$00,$00,$00,$19,$3E,$68,$FC,$68,$3E,$19,$00,$00,$00,$00,$00
SHIP:   DB $03,$07,$06,$0E,$1E,$7E,$FA,$7E,$1E,$0E,$06,$07,$03
SHIPX:  DB $21,$03,$15,$07,$06,$1B,$29,$1B,$06,$07,$15,$03,$21
        DB $13,$06,$2B,$05,$1B,$09,$2A,$09,$1B,$05,$2B,$06,$13
UFOGFX: DB $08,$1A,$3C,$28,$78,$28,$F8,$E8,$F8,$28,$78,$28,$3C,$1A,$08
UFOXGFX: DB $54,$00,$28,$44,$10,$28,$00,$64,$00,$28,$10,$44,$28,$00,$54
AEXPLGFX: DB $00,$00,$92,$54,$00,$28,$00,$C6,$00,$28,$00,$54,$92,$00,$00,$00
SHIELD: DB $0F,$1F,$3F,$7F,$FF,$FF,$FF,$FF,$FF,$FF,$FF,$FF,$FF,$FF,$FF,$FF,$7F,$3F,$1F,$0F
        DB $F0,$F0,$F0,$F0,$F0,$E0,$C0,$80,$00,$00,$00,$00,$80,$C0,$E0,$F0,$F0,$F0,$F0,$F0
PSHOT:  DB $F0
BLASTGFX: DB $AA,$5C,$FB,$3C,$76,$89
MASK12: DB $FF,$FF,$FF,$FF,$FF,$FF,$FF,$FF,$FF,$FF,$FF,$FF
BOMBGFX: DB $88,$54,$22, $22,$54,$88   ; twist
        DB $20,$FE,$20, $10,$FE,$10    ; bolt
        DB $48,$B6,$48, $92,$6C,$92    ; beads
; Digits 0-9 then space, 8 columns each.
FONT:   DB $00,$7C,$82,$92,$82,$7C,$00,$00
        DB $00,$00,$42,$FE,$02,$00,$00,$00
        DB $00,$46,$8A,$92,$92,$62,$00,$00
        DB $00,$82,$92,$92,$92,$6C,$00,$00
        DB $00,$F0,$10,$10,$10,$FE,$00,$00
        DB $00,$E4,$A2,$A2,$A2,$9C,$00,$00
        DB $00,$3C,$52,$92,$92,$0C,$00,$00
        DB $00,$80,$80,$9E,$A0,$C0,$00,$00
        DB $00,$6C,$92,$92,$92,$6C,$00,$00
        DB $00,$60,$92,$92,$94,$78,$00,$00
        DB $00,$00,$00,$00,$00,$00,$00,$00
