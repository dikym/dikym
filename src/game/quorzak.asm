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
HCOL     EQU $2080      ; HITALIEN column being searched
HCNT     EQU $2081

        PUBLIC PX, PSTATE, SHOTON, SHOTX, SHOTY, SHOTCNT, CURSOR, RELOAD
        PUBLIC UFOON, UFOX, UFOTMR, AEXT, ASHOTS, LIVECNT

; ---- Vectors
        ORG 0
        DI
        LXI SP,STACK
        JMP RESET

        ORG 8           ; RST 1, scanline 96: one game tick
        JMP ISR

        ORG $10         ; RST 2, scanline 224: unused
        EI
        RET

; The tick runs at scanline 96 so it finishes before the frame ends, when the
; cabinet adapter samples VRAM for display.
ISR:    PUSH PSW
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
        MOV D,A
        XCHG            ; HL = VRAM byte for column x, bottom row; DE = sprite
        XRA A
        OUT SHIFTDAT    ; each column then leaves the register's high byte 0
        LDA BLITOP
        ORA A
        JZ .or
        DCR A
        JZ .erase
.test:  LDAX D
        OUT SHIFTDAT
        IN SHIFTIN
        ANA M
        JNZ .hit
        INR L
        XRA A
        OUT SHIFTDAT
        IN SHIFTIN
        ANA M
        JNZ .hit
        DCR L
        MOV A,L
        ADI 32
        MOV L,A
        JNC .tnext
        INR H
.tnext: INX D
        DCR B
        JNZ .test
        RET
.hit:   MVI A,1
        STA HIT
        RET
.or:    LDAX D
        OUT SHIFTDAT
        IN SHIFTIN
        ORA M
        MOV M,A
        INR L
        XRA A
        OUT SHIFTDAT
        IN SHIFTIN
        ORA M
        MOV M,A
        DCR L
        MOV A,L
        ADI 32
        MOV L,A
        JNC .onext
        INR H
.onext: INX D
        DCR B
        JNZ .or
        RET
.erase: LDAX D
        OUT SHIFTDAT
        IN SHIFTIN
        CMA
        ANA M
        MOV M,A
        INR L
        XRA A
        OUT SHIFTDAT
        IN SHIFTIN
        CMA
        ANA M
        MOV M,A
        DCR L
        MOV A,L
        ADI 32
        MOV L,A
        JNC .enext
        INR H
.enext: INX D
        DCR B
        JNZ .erase
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
; Only columns 2-13 of the 16-column cell hold pixels.
ALIENBLIT:
        PUSH B
        PUSH PSW
        CALL ALIENXY
        POP PSW
        CALL ALIENGFX
        INX H
        INX H
        INR D
        INR D
        MVI B,12
        CALL BLIT
        POP B
        RET

TICK:   LDA MODE
        CPI 1
        RNZ
        CALL PLAYER
        LDA MODE
        CPI 1
        RNZ
        CALL PLAYERSHOT
        CALL ALIENSHOTS
        CALL UFO
        CALL MARCH
        LDA MODE
        CPI 1
        RNZ
        JMP SOUND

; Ship: erase, move from the inputs, draw. While dying, plays the explosion.
PLAYER: LDA PSTATE
        ORA A
        JNZ .dying
        MVI A,1
        STA BLITOP
        CALL .ship
        IN INPUTS
        MOV B,A
        LDA PX
        MOV C,A
        MOV A,B
        ANI $20
        JZ .noleft
        MOV A,C
        CPI 17
        JC .noleft
        DCR C
.noleft: MOV A,B
        ANI $40
        JZ .noright
        MOV A,C
        CPI 185
        JNC .noright
        INR C
.noright: MOV A,C
        STA PX
        XRA A
        STA BLITOP
.ship:  LXI H,SHIP
.blit:  LDA PX
        MOV D,A
        MVI E,216
        MVI B,13
        JMP BLIT
.dying: DCR A
        STA PSTATE
        JZ .respawn
        CALL .unexplode
        XRA A
        STA BLITOP
        LDA PSTATE
        ANI 4
        LXI H,SHIPX
        JZ .blit
        LXI H,SHIPX+13
        JMP .blit
.respawn:
        CALL .unexplode
        LXI H,LIVES
        DCR M
        JZ GAMEOVER
        MVI A,16
        STA PX
        RET
.unexplode:
        MVI A,1
        STA BLITOP
        LXI H,SHIPX
        CALL .blit
        LXI H,SHIPX+13
        JMP .blit

; Player shot: fire when idle, else move 4 px up and resolve what it touched.
PLAYERSHOT:
        LDA AEXT
        ORA A
        JZ .noexp
        DCR A
        STA AEXT
        JNZ .noexp
        MVI A,1         ; explosion over: erase it
        STA BLITOP
        LDA AEX
        MOV D,A
        LDA AEY
        MOV E,A
        LXI H,AEXPLGFX
        MVI B,16
        CALL BLIT
.noexp: LDA SHOTON
        ORA A
        JNZ .fly
        LDA PSTATE
        LXI H,AEXT
        ORA M
        RNZ
        IN INPUTS
        ANI $10
        RZ
        LDA PX
        ADI 6
        STA SHOTX
        MVI A,212
        STA SHOTY
        MVI A,1
        STA SHOTON
        LXI H,SHOTCNT
        INR M
        LDA PULSEA
        ORI 2
        STA PULSEA
        JMP .draw
.fly:   MVI A,1
        STA BLITOP
        CALL .blit
        LDA SHOTY
        SUI 4
        STA SHOTY
        CPI 32
        JC .gone
        MVI A,2
        STA BLITOP
        XRA A
        STA HIT
        CALL .blit
        LDA HIT
        ORA A
        JNZ .hit
.draw:  XRA A
        STA BLITOP
.blit:  LDA SHOTX
        MOV D,A
        LDA SHOTY
        MOV E,A
        LXI H,PSHOT
        MVI B,1
        JMP BLIT
.gone:  XRA A
        STA SHOTON
        RET
.hit:   XRA A
        STA SHOTON
        CALL SHOTVSBOMB
        RNZ
        LDA SHOTY
        CPI 48
        JC .ufo
        CPI 188
        JNC .shield
        JMP HITALIEN
.ufo:   LDA UFOON
        CPI 1
        RNZ
        JMP HITUFO
.shield: LDA SHOTX
        SUI 2
        MOV D,A
        LDA SHOTY
        SUI 4
        MOV E,A
        MVI A,1
        STA BLITOP
        LXI H,BLASTGFX
        MVI B,6
        JMP BLIT

SHOTVSBOMB: XRA A       ; Task 5
        RET
HITUFO: RET             ; Task 6

; Finds the live alien under the shot, kills it, shows its explosion, scores.
; Only the shot's column and its neighbours can match, since unmoved aliens lag
; one step behind GRIDX; scanning all 55 would overrun the tick.
HITALIEN:
        LDA GRIDX
        MOV B,A
        LDA SHOTX
        SUB B
        MVI C,0
        JC .start
        RRC
        RRC
        RRC
        RRC
        ANI $0F
        ORA A
        JZ .start
        DCR A
        MOV C,A
.start: MOV A,C
        STA HCOL
        MVI A,3
        STA HCNT
.col:   LDA HCOL
        CPI 11
        RNC
        MOV C,A
.loop:  MVI B,0
        LXI H,ALIENS
        DAD B
        MOV A,M
        ORA A
        JZ .next
        CALL ALIENXY
        LDA SHOTX
        SUB D
        SUI 2
        CPI 12
        JNC .next
        LDA SHOTY
        ADI 3
        SUB E
        CPI 11
        JC .found
.next:  MOV A,C
        ADI 11
        MOV C,A
        CPI 55
        JC .loop
        LXI H,HCOL
        INR M
        LXI H,HCNT
        DCR M
        JNZ .col
        RET
.found: MVI M,0
        MOV A,D
        STA AEX
        MOV A,E
        STA AEY
        MOV A,B
        STA TMPA
        MVI A,1
        STA BLITOP
        MOV A,C
        LXI H,CURSOR
        CMP M
        LDA FRAME
        JC .frame
        XRI 1
.frame: CALL ALIENBLIT
        XRA A
        STA BLITOP
        LDA AEX
        MOV D,A
        LDA AEY
        MOV E,A
        LXI H,AEXPLGFX
        MVI B,16
        CALL BLIT
        MVI A,16
        STA AEXT
        LDA TMPA
        MOV C,A
        MVI B,0
        LXI H,ROWPTS
        DAD B
        MOV E,M
        MVI D,0
        CALL ADDSCORE
        LDA PULSEA
        ORI 8
        STA PULSEA
        RET

; Adds BCD points D:E to the score; the first time it reaches 1,500 adds a ship.
ADDSCORE:
        LDA SCORE
        ADD E
        DAA
        STA SCORE
        LDA SCORE+1
        ADC D
        DAA
        STA SCORE+1
        LDA EXTRA
        ORA A
        RNZ
        LDA SCORE+1
        CPI $15
        RC
        MVI A,1
        STA EXTRA
        LXI H,LIVES
        INR M
        LDA PULSEA
        ORI 16
        STA PULSEA
        RET
ALIENSHOTS: RET         ; Task 5
UFO:        RET         ; Task 6

; Moves the next live alien one step. When all have moved, the tick starts the
; next pass instead, keeping the scan and a move out of the same tick.
MARCH:
.find:  LDA CURSOR
        CPI 55
        JZ STARTPASS
        MOV C,A
        MVI B,0
        LXI H,ALIENS
        DAD B
        MOV A,M
        ORA A
        JNZ .move
        INR C
        MOV A,C
        STA CURSOR
        JMP .find
.move:  MVI A,1
        STA BLITOP
        LDA FRAME
        XRI 1
        CALL ALIENBLIT
        MOV A,C
        INR A
        STA CURSOR
        CALL ALIENXY
        MOV A,E
        CPI 185
        JC .draw
        PUSH B          ; low enough to overlap a shield: erase what it covers
        MVI A,1
        STA BLITOP
        LXI H,MASK12
        MVI B,12
        INR D
        INR D
        CALL BLIT
        POP B
.draw:  XRA A
        STA BLITOP
        LDA FRAME
        JMP ALIENBLIT

; Starts a rack pass: wave clear, invasion, edge turn, step, frame and note.
STARTPASS:
        CALL SCAN
        LDA LIVECNT
        ORA A
        JZ NEXTWAVE
        MOV A,D
        ADD A
        ADD A
        ADD A
        ADD A
        MOV E,A
        LDA GRIDY
        SUB E
        CPI 208
        JNC GAMEOVER
        LDA DIR
        ORA A
        JNZ .left
        MOV A,C
        ADD A
        ADD A
        ADD A
        ADD A
        MOV E,A
        LDA GRIDX
        ADD E
        ADI 14
        CPI 214
        JNC .down
        LDA LIVECNT
        CPI 1
        MVI A,2
        JNZ .setx
        MVI A,3         ; the last alien runs faster to the right
        JMP .setx
.left:  MOV A,B
        ADD A
        ADD A
        ADD A
        ADD A
        MOV E,A
        LDA GRIDX
        ADD E
        ADI 2
        CPI 11
        JC .down
        MVI A,$FE
.setx:  STA PDX
        XRA A
        STA PDY
        JMP .step
.down:  XRA A
        STA PDX
        MVI A,8
        STA PDY
        LDA DIR
        XRI 1
        STA DIR
.step:  LDA PDX
        MOV E,A
        LDA GRIDX
        ADD E
        STA GRIDX
        LDA PDY
        MOV E,A
        LDA GRIDY
        ADD E
        STA GRIDY
        LDA FRAME
        XRI 1
        STA FRAME
        XRA A
        STA CURSOR
        LDA NOTE
        MOV E,A
        INR A
        ANI 3
        STA NOTE
        MVI D,0
        LXI H,NOTEBITS
        DAD D
        LDA PULSEB
        ORA M
        STA PULSEB
        RET

; Out: LIVECNT, B = leftmost live column, C = rightmost, D = lowest live row.
SCAN:   LXI H,0
        SHLD TMPA       ; TMPA = row, TMPA+1 = column
        MVI B,10
        MVI C,0
        MVI D,4
        MVI E,0
        LXI H,ALIENS
.loop:  MOV A,M
        ORA A
        JZ .next
        INR E
        LDA TMPA+1
        CMP B
        JNC .nomin
        MOV B,A
.nomin: CMP C
        JC .nomax
        MOV C,A
.nomax: LDA TMPA
        CMP D
        JNC .next
        MOV D,A
.next:  INX H
        LDA TMPA+1
        INR A
        CPI 11
        JNZ .same
        LDA TMPA
        INR A
        STA TMPA
        XRA A
.same:  STA TMPA+1
        MOV A,L
        CPI LOW(ALIENS+55)
        JNZ .loop
        MOV A,E
        STA LIVECNT
        RET

NEXTWAVE:
        LDA WAVE
        INR A
        STA WAVE
        JMP NEWWAVE

GAMEOVER:
        MVI A,2
        STA MODE
        XRA A
        STA UFOPTS
        OUT SOUNDB
        MVI A,$20
        OUT SOUNDA
        RET

; Port 3: enable, UFO loop and this tick's pulses; port 5: this tick's pulses.
SOUND:  LDA UFOON
        CPI 1
        MVI A,$20
        JNZ .a
        MVI A,$21
.a:     LXI H,PULSEA
        ORA M
        OUT SOUNDA
        MVI M,0
        LDA PULSEB
        OUT SOUNDB
        XRA A
        STA PULSEB
        RET

; ---- Data
WAVEY:   DB 120, 136, 144, 152, 152, 160, 160, 160
SHIELDX: DB 32, 77, 122, 167
ROWGFX:  DW DOME, DOME, TWIN, TWIN, SPIRE
NOTEBITS: DB 1, 2, 4, 8
ROWPTS:  DB $10, $10, $20, $20, $30

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
