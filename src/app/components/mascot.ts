import { Component } from '@angular/core';

@Component({
  selector: 'app-mascot',
  standalone: true,
  template: `
    <svg
      class="mascot-svg"
      viewBox="0 0 260 260"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Zech the news bear mascot"
      role="img">

      <!-- ground shadow -->
      <ellipse cx="130" cy="240" rx="80" ry="6" class="m-shadow"/>

      <!-- ears outer -->
      <circle cx="72" cy="58" r="24" class="m-fur"/>
      <circle cx="188" cy="58" r="24" class="m-fur"/>
      <!-- ears inner -->
      <circle cx="72" cy="58" r="12" class="m-fur-inner"/>
      <circle cx="188" cy="58" r="12" class="m-fur-inner"/>

      <!-- head -->
      <circle cx="130" cy="100" r="68" class="m-fur"/>

      <!-- cheek blush -->
      <ellipse cx="80" cy="118" rx="9" ry="5" class="m-blush"/>
      <ellipse cx="180" cy="118" rx="9" ry="5" class="m-blush"/>

      <!-- snout -->
      <ellipse cx="130" cy="120" rx="34" ry="28" class="m-fur-inner"/>

      <!-- nose -->
      <ellipse cx="130" cy="104" rx="9" ry="7" class="m-nose"/>
      <!-- nose highlight -->
      <ellipse cx="127" cy="101" rx="2" ry="1.5" class="m-nose-hl"/>

      <!-- mouth -->
      <path d="M 130 113 L 130 122" class="m-mouth"/>
      <path d="M 130 122 Q 122 132 114 128" class="m-mouth"/>
      <path d="M 130 122 Q 138 132 146 128" class="m-mouth"/>

      <!-- glasses -->
      <circle cx="103" cy="86" r="16" class="m-glass-frame"/>
      <circle cx="157" cy="86" r="16" class="m-glass-frame"/>
      <line x1="119" y1="86" x2="141" y2="86" class="m-glass-bridge"/>
      <!-- glass shine -->
      <path d="M 95 80 Q 102 76 108 82" class="m-glass-shine"/>
      <path d="M 149 80 Q 156 76 162 82" class="m-glass-shine"/>

      <!-- eyes behind glasses -->
      <circle cx="103" cy="88" r="4" class="m-eye"/>
      <circle cx="157" cy="88" r="4" class="m-eye"/>
      <circle cx="104.5" cy="86.5" r="1.4" class="m-eye-hl"/>
      <circle cx="158.5" cy="86.5" r="1.4" class="m-eye-hl"/>

      <!-- newspaper -->
      <g transform="translate(38, 150)">
        <!-- paper shadow -->
        <rect x="2" y="3" width="184" height="98" rx="4" class="m-paper-shadow"/>
        <!-- paper body -->
        <rect x="0" y="0" width="184" height="98" rx="4" class="m-paper"/>
        <!-- center fold -->
        <line x1="92" y1="0" x2="92" y2="98" class="m-paper-fold"/>
        <!-- header banner -->
        <rect x="0" y="0" width="184" height="22" class="m-paper-header"/>
        <text x="92" y="16" text-anchor="middle"
              font-family="Georgia, 'Times New Roman', serif"
              font-weight="900"
              font-size="13"
              letter-spacing="2"
              class="m-paper-title">ZECH NEWS</text>

        <!-- left column lines -->
        <rect x="8" y="30" width="76" height="3" rx="1" class="m-paper-headline"/>
        <rect x="8" y="40" width="60" height="2" rx="1" class="m-paper-line"/>
        <rect x="8" y="46" width="76" height="2" rx="1" class="m-paper-line"/>
        <rect x="8" y="52" width="68" height="2" rx="1" class="m-paper-line"/>
        <!-- left image block -->
        <rect x="8" y="60" width="76" height="30" rx="2" class="m-paper-image"/>

        <!-- right column lines -->
        <rect x="100" y="30" width="76" height="3" rx="1" class="m-paper-headline"/>
        <!-- right image block -->
        <rect x="100" y="40" width="76" height="26" rx="2" class="m-paper-image"/>
        <rect x="100" y="72" width="76" height="2" rx="1" class="m-paper-line"/>
        <rect x="100" y="78" width="64" height="2" rx="1" class="m-paper-line"/>
        <rect x="100" y="84" width="70" height="2" rx="1" class="m-paper-line"/>
        <rect x="100" y="90" width="56" height="2" rx="1" class="m-paper-line"/>
      </g>

      <!-- paws holding paper -->
      <ellipse cx="40" cy="172" rx="17" ry="13" class="m-fur"/>
      <ellipse cx="220" cy="172" rx="17" ry="13" class="m-fur"/>
      <!-- paw pads -->
      <ellipse cx="40" cy="174" rx="9" ry="7" class="m-fur-inner"/>
      <ellipse cx="220" cy="174" rx="9" ry="7" class="m-fur-inner"/>

      <!-- steam from coffee (top right of paper) -->
      <g class="m-steam">
        <path d="M 215 145 Q 210 138 215 130 Q 220 122 215 115" class="m-steam-line"/>
        <path d="M 225 148 Q 220 140 225 132 Q 230 124 225 118" class="m-steam-line"/>
      </g>
    </svg>
  `,
  styles: [`
    :host {
      display: inline-block;
      width: 100%;
      max-width: 320px;
    }
    .mascot-svg {
      width: 100%;
      height: auto;
      display: block;
    }
    /* Bear fur — warm brown, works in both themes */
    .m-fur { fill: #8b5e3c; }
    .m-fur-inner { fill: #c89b6b; }
    .m-shadow { fill: rgba(15, 23, 42, 0.15); }
    .m-blush { fill: rgba(244, 114, 182, 0.45); }
    .m-nose { fill: #2a1810; }
    .m-nose-hl { fill: rgba(255,255,255,0.7); }
    .m-mouth {
      stroke: #2a1810;
      stroke-width: 2.4;
      fill: none;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .m-eye { fill: #1a1a1a; }
    .m-eye-hl { fill: #ffffff; }

    /* Glasses — accent color, theme-aware */
    .m-glass-frame {
      fill: rgba(255,255,255,0.08);
      stroke: var(--accent);
      stroke-width: 3;
    }
    .m-glass-bridge {
      stroke: var(--accent);
      stroke-width: 3;
      stroke-linecap: round;
    }
    .m-glass-shine {
      stroke: rgba(255,255,255,0.7);
      stroke-width: 1.5;
      fill: none;
      stroke-linecap: round;
    }

    /* Newspaper — themed */
    .m-paper { fill: var(--bg2); stroke: var(--border); stroke-width: 1.5; }
    .m-paper-shadow { fill: rgba(0,0,0,0.18); }
    .m-paper-header { fill: var(--accent); }
    .m-paper-title { fill: #ffffff; }
    .m-paper-fold { stroke: var(--border); stroke-width: 1; stroke-dasharray: 2 3; }
    .m-paper-headline { fill: var(--text); }
    .m-paper-line { fill: var(--text3); }
    .m-paper-image { fill: var(--accent-glow); stroke: var(--accent); stroke-width: 1; }

    /* Steam */
    .m-steam-line {
      stroke: var(--text3);
      stroke-width: 2;
      fill: none;
      stroke-linecap: round;
      opacity: 0.55;
      animation: steam-rise 2.4s ease-in-out infinite;
    }
    .m-steam path:nth-child(2) { animation-delay: 0.8s; }

    @keyframes steam-rise {
      0%, 100% { opacity: 0.2; transform: translateY(2px); }
      50% { opacity: 0.7; transform: translateY(-2px); }
    }
  `]
})
export class MascotComponent {}
