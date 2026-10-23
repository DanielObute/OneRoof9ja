// The scenery is two separate drawings, one pinned to each edge of the screen,
// so the middle of the page stays empty at every window size.
//
// Sizing: the left drawing is 23.71% of the window wide, the right one 45%,
// and each stops growing at its max (299px and 567px). To make both bigger or
// smaller, change the two max numbers together, keeping them in this ratio.
// The -32px margins cancel the 32px side padding of the page around this strip.

function Scenery() {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          margin: 'auto -32px 0',
          paddingTop: '48px',
          pointerEvents: 'none',
        }}
      >
        {/* LEFT DRAWING: palms, woman hawking, child */}
        <div style={{ width: 'min(23.71vw, 299px)', flexShrink: 0, lineHeight: 0 }}>
          <svg
            viewBox="8 0 332 380"
            style={{ display: 'block', width: '100%' }}
            role="img"
            aria-label="Palm trees, and a woman hawking with her child"
          >
            <defs>
              <linearGradient id="hillFadeLeft" gradientUnits="userSpaceOnUse" x1="200" y1="0" x2="340" y2="0">
                <stop offset="0" stopColor="#2f3b27" stopOpacity="1"/>
                <stop offset="1" stopColor="#2f3b27" stopOpacity="0"/>
              </linearGradient>
            </defs>
            {/* hills and ground */}
            <path d="M0 338 C140 316 300 310 460 328 S760 342 920 326 S1170 298 1290 304 S1380 316 1400 310 L1400 380 L0 380 Z" fill="url(#hillFadeLeft)"/>
            <g transform="translate(0 0)">
  
              {/* birds */}
              <g fill="none" stroke="#d9ccaa" strokeWidth="2.5" strokeLinecap="round" opacity="0.8">
                <path d="M190 56 q9 -9 18 0 q9 -9 18 0"/>
                <path d="M246 30 q8 -8 16 0 q8 -8 16 0"/>
                <path d="M224 84 q6 -6 12 0 q6 -6 12 0"/>
              </g>
  
              {/* big palm */}
              <g transform="translate(-14 -62)" opacity="0.92">
                <path d="M104 440 Q112 320 100 200" fill="none" stroke="#6b4a2a" strokeWidth="9" strokeLinecap="round"/>
                <g fill="#5e8a45">
                  <path d="M100 200 Q55 188 28 150 Q78 158 100 200 Z"/>
                  <path d="M100 200 Q68 160 70 122 Q104 150 100 200 Z"/>
                  <path d="M100 200 Q112 156 106 116 Q136 152 100 200 Z"/>
                  <path d="M100 200 Q142 180 172 150 Q124 160 100 200 Z"/>
                </g>
                <g fill="#4a7036">
                  <path d="M100 200 Q150 200 176 224 Q130 216 100 200 Z"/>
                  <path d="M100 200 Q50 206 26 232 Q70 220 100 200 Z"/>
                </g>
              </g>
  
              {/* small palm */}
              <g transform="translate(-46 -62)" opacity="0.92">
                <path d="M196 440 Q188 360 196 290" fill="none" stroke="#6b4a2a" strokeWidth="7" strokeLinecap="round"/>
                <g fill="#5e8a45">
                  <path d="M196 290 Q166 282 148 258 Q182 264 196 290 Z"/>
                  <path d="M196 290 Q178 264 180 240 Q202 260 196 290 Z"/>
                  <path d="M196 290 Q216 266 214 242 Q234 264 196 290 Z"/>
                  <path d="M196 290 Q228 282 246 260 Q214 266 196 290 Z"/>
                </g>
              </g>
  
              {/* child and woman hawking */}
              <g transform="translate(-55 -62)" opacity="0.92">
                <path d="M249 388 Q263 386 279 398" fill="none" stroke="#5a3a24" strokeWidth="4" strokeLinecap="round"/>
                <path d="M233 388 Q226 398 228 406" fill="none" stroke="#5a3a24" strokeWidth="4" strokeLinecap="round"/>
                <path d="M236 420 L236 434 M246 420 L246 434" fill="none" stroke="#5a3a24" strokeWidth="4" strokeLinecap="round"/>
                <path d="M232 384 L250 384 L254 422 L228 422 Z" fill="#e0a845"/>
                <path d="M228.5 416 L253.5 416 L254 422 L228 422 Z" fill="#8c3d2c"/>
                <circle cx="241" cy="374" r="8" fill="#5a3a24"/>
                <path d="M233 373 Q241 362 249 373 Q241 368 233 373 Z" fill="#2b1a0e"/>
                <path d="M293 318 Q282 304 284 290" fill="none" stroke="#5a3a24" strokeWidth="5" strokeLinecap="round"/>
                <path d="M310 320 Q324 348 318 372" fill="none" stroke="#5a3a24" strokeWidth="5" strokeLinecap="round"/>
                <path d="M290 314 Q300 310 310 314 L313 342 L287 342 Z" fill="#e0a845"/>
                <path d="M287 342 L313 342 L330 434 L272 434 Z" fill="#b85c3e"/>
                <path d="M279 398 L323 398 L325 408 L277 408 Z" fill="#8c3d2c"/>
                <circle cx="300" cy="300" r="9" fill="#5a3a24"/>
                <ellipse cx="300" cy="293" rx="11" ry="6" fill="#8c3d2c"/>
                <path d="M274 282 L326 282 L319 292 L281 292 Z" fill="#b98953"/>
                <ellipse cx="286" cy="277" rx="8" ry="5" fill="#b85c3e"/>
                <ellipse cx="300" cy="273" rx="10" ry="7" fill="#e0a845"/>
                <ellipse cx="315" cy="277" rx="8" ry="5" fill="#b85c3e"/>
              </g>
  
              {/* grass */}
              <g stroke="#5e8a45" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.8">
                <path d="M312 374 L306 362 M319 374 L319 359 M326 374 L332 362"/>
              </g>
              <circle cx="320" cy="358" r="3.5" fill="#c1394b"/>
  
            </g>
          </svg>
        </div>
  
        {/* RIGHT DRAWING: group walking home toward the hut */}
        <div style={{ width: 'min(45vw, 567px)', flexShrink: 0, lineHeight: 0 }}>
          <svg
            viewBox="760 0 630 380"
            style={{ display: 'block', width: '100%' }}
            role="img"
            aria-label="A group of people in traditional dress walking home toward a hut"
          >
            <defs>
              <linearGradient id="hillFadeRight" gradientUnits="userSpaceOnUse" x1="760" y1="0" x2="860" y2="0">
                <stop offset="0" stopColor="#2f3b27" stopOpacity="0"/>
                <stop offset="1" stopColor="#2f3b27" stopOpacity="1"/>
              </linearGradient>
            </defs>
            {/* hills and ground */}
            <path d="M0 338 C140 316 300 310 460 328 S760 342 920 326 S1170 298 1290 304 S1380 316 1400 310 L1400 380 L0 380 Z" fill="url(#hillFadeRight)"/>
            <g transform="translate(100 0)">
  
              {/* sun */}
              <g transform="translate(1180 62) scale(0.6)" opacity="0.92">
                <circle r="22" fill="#e0a845"/>
                <g stroke="#e0a845" strokeWidth="3" strokeLinecap="round">
                  <line x1="0" y1="-30" x2="0" y2="-40"/>
                  <line x1="21.2" y1="-21.2" x2="28.3" y2="-28.3"/>
                  <line x1="30" y1="0" x2="40" y2="0"/>
                  <line x1="21.2" y1="21.2" x2="28.3" y2="28.3"/>
                  <line x1="0" y1="30" x2="0" y2="40"/>
                  <line x1="-21.2" y1="21.2" x2="-28.3" y2="28.3"/>
                  <line x1="-30" y1="0" x2="-40" y2="0"/>
                  <line x1="-21.2" y1="-21.2" x2="-28.3" y2="-28.3"/>
                </g>
              </g>
  
              {/* birds */}
              <g fill="none" stroke="#d9ccaa" strokeWidth="2.5" strokeLinecap="round" opacity="0.8">
                <path d="M930 44 q7 -7 14 0 q7 -7 14 0"/>
                <path d="M976 78 q6 -6 12 0 q6 -6 12 0"/>
              </g>
  
              {/* road to the hut */}
              <polygon points="660,380 1150,380 1195,336 1185,336" fill="#b98953" opacity="0.5"/>
  
              {/* distant palm and hut */}
              <g opacity="0.85">
                <g transform="translate(1252 336) scale(0.34) translate(-112 -440)">
                  <path d="M112 440 Q102 340 110 230" fill="none" stroke="#6b4a2a" strokeWidth="9" strokeLinecap="round"/>
                  <g fill="#5e8a45">
                    <path d="M110 230 Q66 218 40 180 Q90 188 110 230 Z"/>
                    <path d="M110 230 Q78 190 80 152 Q114 180 110 230 Z"/>
                    <path d="M110 230 Q122 186 116 146 Q146 182 110 230 Z"/>
                    <path d="M110 230 Q152 210 182 180 Q134 190 110 230 Z"/>
                  </g>
                  <g fill="#4a7036">
                    <path d="M110 230 Q160 230 186 254 Q140 246 110 230 Z"/>
                    <path d="M110 230 Q60 236 36 262 Q80 250 110 230 Z"/>
                  </g>
                </g>
                <g transform="translate(1190 336) scale(0.34) translate(-276 -440)">
                  <rect x="216" y="338" width="120" height="102" fill="#e7dcc0"/>
                  <path d="M206 338 L276 258 L346 338 Z" fill="#b98953"/>
                  <path d="M206 338 L346 338" stroke="#b85c3e" strokeWidth="5"/>
                  <path d="M276 258 L238 338 M276 258 L258 338 M276 258 L276 338 M276 258 L294 338 M276 258 L314 338" stroke="#8b5e34" strokeWidth="2" fill="none"/>
                  <circle cx="276" cy="254" r="5" fill="#b85c3e"/>
                  <path d="M262 440 V386 Q276 368 290 386 V440 Z" fill="#8c3d2c"/>
                </g>
              </g>
  
              {/* GROUP WALKING HOME (facing right) */}
  
              {/* A: man in agbada and fila cap */}
              <g transform="translate(790 372)">
                <ellipse cx="4" cy="0" rx="28" ry="4" fill="#000" opacity="0.25"/>
                <path d="M-4 -16 L-9 -3 M8 -16 L15 -3" stroke="#4a2f1d" strokeWidth="5" strokeLinecap="round" fill="none"/>
                <ellipse cx="-6" cy="-1" rx="7" ry="2.6" fill="#2b1a0e"/>
                <ellipse cx="19" cy="-1" rx="7" ry="2.6" fill="#2b1a0e"/>
                <path d="M-8 -112 L-22 -78" stroke="#3b4a63" strokeWidth="8" strokeLinecap="round" fill="none"/>
                <circle cx="-23" cy="-74" r="3.6" fill="#4a2f1d"/>
                <path d="M-13 -118 L13 -118 L21 -14 L-19 -14 Z" fill="#e7dcc0"/>
                <path d="M-16 -121 Q0 -127 16 -121 L30 -50 Q4 -42 -26 -52 Z" fill="#3b4a63"/>
                <path d="M-26 -52 Q4 -42 30 -50" fill="none" stroke="#e0a845" strokeWidth="3"/>
                <path d="M0 -121 L0 -47" stroke="#e0a845" strokeWidth="2.5"/>
                <path d="M-8 -104 L-2 -97 L-8 -90 L-14 -97 Z" fill="#e0a845"/>
                <path d="M8 -116 L36 -72 L14 -62 L2 -100 Z" fill="#4a5c78" stroke="#e0a845" strokeWidth="1.5" strokeLinejoin="round"/>
                <circle cx="36" cy="-70" r="3.6" fill="#4a2f1d"/>
                <circle cx="2" cy="-134" r="9" fill="#4a2f1d"/>
                <path d="M9 -137 L14.5 -133.5 L9 -131 Z" fill="#4a2f1d"/>
                <path d="M-8 -139 Q-8 -158 8 -154 Q20 -150 14 -139 Q3 -146 -8 -139 Z" fill="#8c3d2c"/>
                <path d="M-8 -140 Q3 -146 14 -140" fill="none" stroke="#e0a845" strokeWidth="1.5"/>
              </g>
  
              {/* B: woman in gele, blouse and green wrapper */}
              <g transform="translate(872 374)">
                <ellipse cx="2" cy="0" rx="26" ry="4" fill="#000" opacity="0.25"/>
                <path d="M-4 -14 L-8 -3 M8 -14 L15 -3" stroke="#5a3a24" strokeWidth="4.5" strokeLinecap="round" fill="none"/>
                <ellipse cx="-5" cy="-1" rx="6.5" ry="2.4" fill="#2b1a0e"/>
                <ellipse cx="18" cy="-1" rx="6.5" ry="2.4" fill="#2b1a0e"/>
                <path d="M-10 -108 Q-18 -94 -21 -82" fill="none" stroke="#5a3a24" strokeWidth="4.5" strokeLinecap="round"/>
                <path d="M-13 -92 L12 -92 L24 -12 L-23 -12 Z" fill="#3f6e3a"/>
                <path d="M-23 -12 L24 -12 L25 -23 L-24 -23 Z" fill="#2c5128"/>
                <g fill="#e0a845">
                  <circle cx="-8" cy="-74" r="2.2"/>
                  <circle cx="6" cy="-64" r="2.2"/>
                  <circle cx="-3" cy="-50" r="2.2"/>
                  <circle cx="12" cy="-40" r="2.2"/>
                  <circle cx="-14" cy="-38" r="2.2"/>
                </g>
                <path d="M-12 -116 Q0 -122 12 -116 L13 -92 L-13 -92 Z" fill="#e7dcc0"/>
                <path d="M-11 -114 L-1 -114 L15 -88 L5 -86 Z" fill="#b85c3e"/>
                <ellipse cx="9" cy="-110" rx="7" ry="6" fill="#e7dcc0"/>
                <path d="M10 -105 Q22 -92 31 -80" fill="none" stroke="#5a3a24" strokeWidth="4.5" strokeLinecap="round"/>
                <circle cx="2" cy="-126" r="8.5" fill="#5a3a24"/>
                <path d="M9 -128 L14 -125 L9 -123 Z" fill="#5a3a24"/>
                <ellipse cx="-4" cy="-141" rx="17" ry="11" fill="#b85c3e"/>
                <ellipse cx="6" cy="-146" rx="12" ry="8" fill="#e0a845"/>
                <ellipse cx="-2" cy="-152" rx="8" ry="6" fill="#8c3d2c"/>
              </g>
  
              {/* C: Hausa man in long gown and tall cap */}
              <g transform="translate(954 371)">
                <ellipse cx="3" cy="0" rx="27" ry="4" fill="#000" opacity="0.25"/>
                <path d="M-4 -16 L-9 -3 M7 -16 L14 -3" stroke="#6b4630" strokeWidth="5" strokeLinecap="round" fill="none"/>
                <ellipse cx="-6" cy="-1" rx="7" ry="2.6" fill="#2b1a0e"/>
                <ellipse cx="18" cy="-1" rx="7" ry="2.6" fill="#2b1a0e"/>
                <path d="M-8 -112 L-20 -76" stroke="#7aa3c2" strokeWidth="8" strokeLinecap="round" fill="none"/>
                <circle cx="-21" cy="-72" r="3.6" fill="#6b4630"/>
                <path d="M-15 -118 L15 -118 L25 -18 L-25 -18 Z" fill="#7aa3c2"/>
                <path d="M-25 -18 L25 -18 L26 -26 L-26 -26 Z" fill="#5f87a6"/>
                <path d="M-7 -118 L0 -100 L7 -118" fill="none" stroke="#e0a845" strokeWidth="2.5" strokeLinejoin="round"/>
                <path d="M-9 -98 Q0 -88 9 -98" fill="none" stroke="#e0a845" strokeWidth="2"/>
                <path d="M-9 -88 Q0 -78 9 -88" fill="none" stroke="#e0a845" strokeWidth="2"/>
                <path d="M8 -116 L32 -78 L12 -68 L2 -102 Z" fill="#8fb3d0" stroke="#e0a845" strokeWidth="1.5" strokeLinejoin="round"/>
                <circle cx="32" cy="-76" r="3.6" fill="#6b4630"/>
                <circle cx="1" cy="-132" r="9" fill="#6b4630"/>
                <path d="M8 -134 L13.5 -130.5 L8 -128 Z" fill="#6b4630"/>
                <path d="M-9 -138 L-7 -156 L11 -156 L13 -138 Z" fill="#8c3d2c"/>
                <path d="M-9 -139 L13 -139" stroke="#e0a845" strokeWidth="2"/>
                <path d="M-8 -146 L12 -146" stroke="#e0a845" strokeWidth="1.2"/>
              </g>
  
              {/* D: mother with baby on her back, holding her child's hand */}
              <g transform="translate(1034 373)">
                <ellipse cx="2" cy="0" rx="26" ry="4" fill="#000" opacity="0.25"/>
                <path d="M-4 -14 L-8 -3 M8 -14 L15 -3" stroke="#5a3a24" strokeWidth="4.5" strokeLinecap="round" fill="none"/>
                <ellipse cx="-5" cy="-1" rx="6.5" ry="2.4" fill="#2b1a0e"/>
                <ellipse cx="18" cy="-1" rx="6.5" ry="2.4" fill="#2b1a0e"/>
                <path d="M-10 -106 Q-16 -92 -19 -80" fill="none" stroke="#5a3a24" strokeWidth="4.5" strokeLinecap="round"/>
                <path d="M-13 -92 L12 -92 L24 -12 L-23 -12 Z" fill="#3b4a63"/>
                <g fill="#e7dcc0">
                  <circle cx="-8" cy="-80" r="1.8"/>
                  <circle cx="4" cy="-82" r="1.8"/>
                  <circle cx="-14" cy="-62" r="1.8"/>
                  <circle cx="-2" cy="-64" r="1.8"/>
                  <circle cx="10" cy="-66" r="1.8"/>
                  <circle cx="-18" cy="-44" r="1.8"/>
                  <circle cx="-7" cy="-46" r="1.8"/>
                  <circle cx="5" cy="-48" r="1.8"/>
                  <circle cx="16" cy="-50" r="1.8"/>
                  <circle cx="-20" cy="-28" r="1.8"/>
                  <circle cx="-9" cy="-30" r="1.8"/>
                  <circle cx="3" cy="-32" r="1.8"/>
                  <circle cx="14" cy="-34" r="1.8"/>
                  <circle cx="21" cy="-22" r="1.8"/>
                </g>
                <ellipse cx="-14" cy="-98" rx="8" ry="13" fill="#e7dcc0" stroke="#c9b98f" strokeWidth="1"/>
                <circle cx="-14" cy="-115" r="5.5" fill="#5a3a24"/>
                <path d="M-12 -116 Q0 -122 12 -116 L13 -92 L-13 -92 Z" fill="#b85c3e"/>
                <path d="M9 -108 Q24 -94 31 -62" fill="none" stroke="#5a3a24" strokeWidth="4.5" strokeLinecap="round"/>
                <circle cx="2" cy="-126" r="8.5" fill="#5a3a24"/>
                <path d="M9 -128 L14 -125 L9 -123 Z" fill="#5a3a24"/>
                <path d="M-8 -131 Q2 -142 12 -131 Q3 -134 -8 -131 Z" fill="#8c3d2c"/>
                <ellipse cx="-3" cy="-135" rx="7" ry="4.5" fill="#8c3d2c"/>
              </g>
  
              {/* E: child */}
              <g transform="translate(1092 373)">
                <ellipse cx="0" cy="0" rx="16" ry="3" fill="#000" opacity="0.25"/>
                <path d="M-3 -26 L-5 -3 M5 -26 L9 -3" stroke="#5a3a24" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
                <ellipse cx="-3" cy="-1" rx="5" ry="2" fill="#2b1a0e"/>
                <ellipse cx="12" cy="-1" rx="5" ry="2" fill="#2b1a0e"/>
                <path d="M-6 -68 Q-14 -62 -24 -54" fill="none" stroke="#5a3a24" strokeWidth="3.5" strokeLinecap="round"/>
                <path d="M-9 -72 Q0 -77 9 -72 L16 -26 L-16 -26 Z" fill="#c1394b"/>
                <path d="M-16 -26 L16 -26 L17 -33 L-17 -33 Z" fill="#e7dcc0"/>
                <path d="M6 -68 Q14 -56 12 -46" fill="none" stroke="#5a3a24" strokeWidth="3.5" strokeLinecap="round"/>
                <circle cx="1" cy="-82" r="6.5" fill="#5a3a24"/>
                <path d="M6.5 -84 L10.5 -81.5 L6.5 -79.5 Z" fill="#5a3a24"/>
                <circle cx="-4" cy="-89" r="4" fill="#2b1a0e"/>
                <circle cx="3" cy="-90" r="3.4" fill="#2b1a0e"/>
              </g>
  
              {/* grass */}
              <g stroke="#5e8a45" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.8">
                <path d="M740 374 L734 362 M747 374 L747 359 M754 374 L760 362"/>
                <path d="M1136 374 L1130 362 M1143 374 L1143 359 M1150 374 L1156 362"/>
              </g>
              <circle cx="748" cy="358" r="3.5" fill="#e0a845"/>
              <circle cx="1144" cy="358" r="3.5" fill="#c1394b"/>
  
            </g>
          </svg>
        </div>
      </div>
    );
  }
  
  export default Scenery;