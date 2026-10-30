# 원본 스타일 상세 목록 — v0.1.0

2026-10-31 기록. 초기 소스에서 자동 추출했습니다. CSS 블록은 읽기 위한 줄바꿈·들여쓰기만 추가했으며 실행 소스는 `dist/style.css`입니다. 전체 SVG 도형은 문서 하단에 보존합니다.

## 모든 HEX 색상

- `#041c27`
- `#061f29`
- `#061f32`
- `#062432`
- `#071e29`
- `#071e2960`
- `#0b4559`
- `#10333b`
- `#15343e`
- `#163d5055`
- `#1a64566b`
- `#1c383448`
- `#1d5865`
- `#1d6878`
- `#25322e50`
- `#267786`
- `#418b91`
- `#52666a`
- `#528985`
- `#536a6a`
- `#637774`
- `#687d7d`
- `#69a5a1`
- `#738a9e`
- `#79b5ff`
- `#7e9c99`
- `#80918e`
- `#809b98`
- `#88b2ac`
- `#8dbdb4`
- `#9483a9`
- `#9bd1c2`
- `#a0b4ba`
- `#a1d9ce`
- `#a1d9d16b`
- `#b5c8c6`
- `#b5e6d508`
- `#b5e6d509`
- `#b8d4aa`
- `#bdc8c3`
- `#c4e9de`
- `#c6c5cb`
- `#d5efde`
- `#d6d8c9`
- `#d6efbc`
- `#d6f48a`
- `#d7f1d7`
- `#e0f4d8`
- `#e6ffb3`
- `#e7c6b4`
- `#edf0b0`
- `#f0ffd4`
- `#f4f4ec`
- `#fff`
- `#ffffff24`
- `#ffffff40`

## CSS 규칙 전체

```css
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;
500;
600;
700&family=Noto+Sans+KR:wght@400;
500;
600;
700;
800&display=swap');
:root{
  --navy:#071e29;
  --lime:#d6f48a;
  --paper:#f4f4ec;
  --muted:#a0b4ba}
  *{
    box-sizing:border-box}
    html{
      scroll-behavior:smooth;
      scroll-padding-top:85px}
      body{
        margin:0;
        background:var(--navy);
        color:var(--paper);
        font-family:'DM Sans','Noto Sans KR',sans-serif;
        -webkit-font-smoothing:antialiased}
        a{
          color:inherit;
          text-decoration:none}
          button{
            font:inherit;
            cursor:pointer}
            a:focus-visible,button:focus-visible{
              outline:3px solid #79b5ff;
              outline-offset:6px}
              header{
                height:92px;
                display:flex;
                align-items:center;
                justify-content:space-between;
                padding:0 5%;
                border-bottom:1px solid #ffffff24}
                .logo{
                  font-size:34px;
                  font-weight:700;
                  letter-spacing:-2px}
                  .logo span{
                    font-size:11px;
                    vertical-align:top;
                    display:inline-block;
                    margin:7px 0 0 5px;
                    letter-spacing:0}
                    nav{
                      display:flex;
                      gap:34px;
                      font-size:13px}
                      nav a:hover,.contact-nav:hover{
                        color:var(--lime)}
                        .contact-nav{
                          font-size:13px}
                          .contact-nav span{
                            margin-left:28px}
                            .hero{
                              position:relative;
                              padding:65px 5% 0;
                              display:grid;
                              grid-template-columns:1.15fr 1fr;
                              gap:4%;
                              overflow:hidden}
                              .hero-copy{
                                padding:25px 0 50px;
                                z-index:1}
                                .eyebrow{
                                  font-size:10px;
                                  font-weight:600;
                                  letter-spacing:2px;
                                  display:flex;
                                  align-items:center;
                                  gap:10px;
                                  margin:0 0 32px}
                                  .eyebrow i{
                                    width:6px;
                                    height:6px;
                                    border-radius:50%;
                                    background:var(--lime)}
                                    h1{
                                      font-size:clamp(46px,5.7vw,90px);
                                      line-height:1.06;
                                      letter-spacing:-4px;
                                      font-weight:500;
                                      margin:40px 0 30px;
                                      white-space:nowrap}
                                      h1 em{
                                        color:var(--lime);
                                        font-family:Georgia,serif;
                                        font-weight:400}
                                        h2{
                                          font-size:clamp(30px,3.6vw,56px);
                                          line-height:1.35;
                                          font-weight:500;
                                          letter-spacing:-2px;
                                          margin:0}
                                          h3{
                                            font-weight:500}
                                            .hero-ko{
                                              font-size:23px;
                                              line-height:1.6;
                                              letter-spacing:-.8px}
                                              .intro{
                                                font-size:13px;
                                                color:var(--muted);
                                                line-height:1.95;
                                                margin:22px 0 35px}
                                                .button{
                                                  display:inline-flex;
                                                  align-items:center;
                                                  gap:50px;
                                                  padding:17px 23px;
                                                  background:var(--lime);
                                                  color:var(--navy);
                                                  border-radius:2px;
                                                  font-size:13px;
                                                  font-weight:600}
                                                  .button:hover{
                                                    background:#e6ffb3}
                                                    .ocean{
                                                      position:relative;
                                                      min-height:560px;
                                                      max-height:650px;
                                                      border-radius:46% 46% 0 0;
                                                      overflow:hidden}
                                                      .ocean svg{
                                                        width:100%;
                                                        height:100%;
                                                        object-fit:cover;
                                                        position:absolute}
                                                        .image-top{
                                                          position:absolute;
                                                          top:75px;
                                                          left:50%;
                                                          transform:translateX(-50%);
                                                          font-size:9px;
                                                          letter-spacing:2px;
                                                          white-space:nowrap}
                                                          .image-bottom{
                                                            position:absolute;
                                                            bottom:42px;
                                                            left:30px;
                                                            right:30px;
                                                            display:flex;
                                                            justify-content:space-between;
                                                            font-size:13px}
                                                            .art-label{
                                                              position:absolute;
                                                              right:24px;
                                                              bottom:15px;
                                                              font-size:7px;
                                                              letter-spacing:2px;
                                                              opacity:.55}
                                                              .hero-bottom{
                                                                grid-column:1/-1;
                                                                display:flex;
                                                                justify-content:space-between;
                                                                padding:25px 0;
                                                                font-size:9px;
                                                                letter-spacing:1.7px;
                                                                color:var(--muted)}
                                                                .ticker{
                                                                  padding:24px 0;
                                                                  overflow:hidden;
                                                                  white-space:nowrap;
                                                                  background:var(--lime);
                                                                  color:var(--navy);
                                                                  font-size:21px;
                                                                  letter-spacing:2px;
                                                                  display:flex;
                                                                  justify-content:space-around;
                                                                  gap:30px}
                                                                  .ticker span{
                                                                    font-size:29px;
                                                                    line-height:1}
                                                                    .section{
                                                                      padding:110px 7%}
                                                                      .about{
                                                                        background:var(--paper);
                                                                        color:var(--navy);
                                                                        display:grid;
                                                                        grid-template-columns:1fr 2fr;
                                                                        gap:40px}
                                                                        .dark{
                                                                          color:#52666a}
                                                                          .about h2 span{
                                                                            color:#80918e}
                                                                            .about-bottom{
                                                                              display:grid;
                                                                              grid-template-columns:1fr 1fr;
                                                                              gap:35px;
                                                                              margin-top:40px;
                                                                              font-size:13px;
                                                                              line-height:2;
                                                                              color:#52666a}
                                                                              .signature{
                                                                                font-size:19px;
                                                                                margin-top:30px}
                                                                                .signature span{
                                                                                  font-size:11px;
                                                                                  margin-left:15px;
                                                                                  color:#687d7d}
                                                                                  .practice{
                                                                                    display:grid;
                                                                                    grid-template-columns:1fr 1.5fr;
                                                                                    gap:65px}
                                                                                    .practices{
                                                                                      display:grid;
                                                                                      grid-template-columns:1fr 1fr;
                                                                                      gap:40px}
                                                                                      .practices article{
                                                                                        border-top:1px solid #ffffff40;
                                                                                        padding-top:25px}
                                                                                        .line-icon{
                                                                                          float:right;
                                                                                          font-size:42px;
                                                                                          color:var(--lime);
                                                                                          line-height:1}
                                                                                          .small{
                                                                                            font-size:9px;
                                                                                            letter-spacing:1.5px;
                                                                                            color:var(--muted)}
                                                                                            .practices h3{
                                                                                              font-size:35px;
                                                                                              line-height:1.1;
                                                                                              letter-spacing:-1px;
                                                                                              margin:50px 0 25px}
                                                                                              .practices p{
                                                                                                font-size:13px}
                                                                                                .muted{
                                                                                                  color:var(--muted);
                                                                                                  line-height:1.9}
                                                                                                  .practices a{
                                                                                                    display:flex;
                                                                                                    justify-content:space-between;
                                                                                                    font-size:12px;
                                                                                                    margin-top:35px;
                                                                                                    padding-bottom:15px;
                                                                                                    border-bottom:1px solid #ffffff40}
                                                                                                    .practices a:hover{
                                                                                                      color:var(--lime)}
                                                                                                      .work{
                                                                                                        background:var(--paper);
                                                                                                        color:var(--navy)}
                                                                                                        .work-heading{
                                                                                                          display:flex;
                                                                                                          justify-content:space-between;
                                                                                                          align-items:end;
                                                                                                          gap:30px}
                                                                                                          .work-heading p:not(.eyebrow){
                                                                                                            font-size:12px;
                                                                                                            line-height:1.9;
                                                                                                            color:#536a6a}
                                                                                                            .work-heading p span{
                                                                                                              font-size:10px}
                                                                                                              .filters{
                                                                                                                display:flex;
                                                                                                                gap:10px;
                                                                                                                margin:40px 0 30px}
                                                                                                                .filters button{
                                                                                                                  border:1px solid #bdc8c3;
                                                                                                                  border-radius:30px;
                                                                                                                  padding:10px 20px;
                                                                                                                  background:transparent;
                                                                                                                  color:var(--navy);
                                                                                                                  font-size:12px}
                                                                                                                  .filters button.active{
                                                                                                                    background:var(--navy);
                                                                                                                    color:white;
                                                                                                                    border-color:var(--navy)}
                                                                                                                    sup{
                                                                                                                      font-size:8px;
                                                                                                                      margin-left:5px}
                                                                                                                      .gallery{
                                                                                                                        display:grid;
                                                                                                                        grid-template-columns:repeat(3,1fr);
                                                                                                                        gap:24px}
                                                                                                                        .gallery article[hidden]{
                                                                                                                          display:none}
                                                                                                                          .art{
                                                                                                                            height:370px;
                                                                                                                            overflow:hidden;
                                                                                                                            position:relative;
                                                                                                                            transition:transform .3s}
                                                                                                                            .art:hover{
                                                                                                                              transform:translateY(-5px)}
                                                                                                                              .art-ocean{
                                                                                                                                background:radial-gradient(ellipse at 50% 0,#9bd1c2 0,#418b91 20%,#0b4559 50%,#061f32 100%)}
                                                                                                                                .rings{
                                                                                                                                  position:absolute;
                                                                                                                                  border:1px solid #a1d9d16b;
                                                                                                                                  border-radius:50%;
                                                                                                                                  width:230px;
                                                                                                                                  height:230px;
                                                                                                                                  top:40px;
                                                                                                                                  left:calc(50% - 115px);
                                                                                                                                  box-shadow:0 0 0 22px #b5e6d508,0 0 0 45px #b5e6d509,0 0 0 70px #b5e6d508;
                                                                                                                                  transform:rotateX(45deg)}
                                                                                                                                  .art-orb{
                                                                                                                                    background:#d6d8c9}
                                                                                                                                    .orb{
                                                                                                                                      width:205px;
                                                                                                                                      height:205px;
                                                                                                                                      border-radius:50%;
                                                                                                                                      position:absolute;
                                                                                                                                      left:calc(50% - 103px);
                                                                                                                                      top:74px;
                                                                                                                                      background:radial-gradient(circle at 32% 25%,#f0ffd4 0,#b8d4aa 17%,#528985 35%,#1d5865 47%,#e7c6b4 65%,#738a9e 76%,#15343e 90%);
                                                                                                                                      box-shadow:15px 40px 34px #1c383448,inset -8px -8px 20px #163d5055}
                                                                                                                                      .art-sculpt{
                                                                                                                                        background:linear-gradient(160deg,#9483a9,#c6c5cb 50%,#7e9c99)}
                                                                                                                                        .sculpt{
                                                                                                                                          position:absolute;
                                                                                                                                          width:155px;
                                                                                                                                          height:240px;
                                                                                                                                          border:32px solid #d6efbc;
                                                                                                                                          border-radius:50%;
                                                                                                                                          left:calc(50% - 77px);
                                                                                                                                          top:50px;
                                                                                                                                          transform:rotate(35deg);
                                                                                                                                          box-shadow:inset 8px 5px 15px #1a64566b,12px 15px 25px #25322e50;
                                                                                                                                          background:linear-gradient(45deg,#1d6878,#88b2ac);
                                                                                                                                          outline:1px solid #edf0b0}
                                                                                                                                          .preview-label{
                                                                                                                                            position:absolute;
                                                                                                                                            left:18px;
                                                                                                                                            top:20px;
                                                                                                                                            font-size:7px;
                                                                                                                                            letter-spacing:2px;
                                                                                                                                            color:#fff;
                                                                                                                                            background:#071e2960;
                                                                                                                                            padding:6px 8px}
                                                                                                                                            .art-title{
                                                                                                                                              position:absolute;
                                                                                                                                              left:23px;
                                                                                                                                              bottom:28px;
                                                                                                                                              font-size:32px;
                                                                                                                                              line-height:1.1;
                                                                                                                                              letter-spacing:-1px;
                                                                                                                                              color:#fff}
                                                                                                                                              .art-orb .art-title{
                                                                                                                                                color:var(--navy)}
                                                                                                                                                .art-no{
                                                                                                                                                  position:absolute;
                                                                                                                                                  right:20px;
                                                                                                                                                  bottom:26px;
                                                                                                                                                  font-size:10px;
                                                                                                                                                  color:white}
                                                                                                                                                  .caption{
                                                                                                                                                    padding:18px 0}
                                                                                                                                                    .caption h3{
                                                                                                                                                      font-size:17px;
                                                                                                                                                      margin:0 0 8px}
                                                                                                                                                      .caption span{
                                                                                                                                                        font-size:8px;
                                                                                                                                                        letter-spacing:1px;
                                                                                                                                                        color:#637774}
                                                                                                                                                        .work-note{
                                                                                                                                                          font-size:12px;
                                                                                                                                                          color:#637774;
                                                                                                                                                          margin-top:40px}
                                                                                                                                                          .social-links{
                                                                                                                                                            display:flex;
                                                                                                                                                            gap:25px;
                                                                                                                                                            font-size:14px}
                                                                                                                                                            .social-links a{
                                                                                                                                                              border-bottom:1px solid #80918e;
                                                                                                                                                              padding-bottom:5px}
                                                                                                                                                              .contact{
                                                                                                                                                                position:relative;
                                                                                                                                                                background:#10333b}
                                                                                                                                                                .contact h2{
                                                                                                                                                                  font-size:clamp(55px,7vw,105px);
                                                                                                                                                                  line-height:1.15;
                                                                                                                                                                  letter-spacing:-4px}
                                                                                                                                                                  .contact h2 em{
                                                                                                                                                                    font-style:normal;
                                                                                                                                                                    color:var(--lime)}
                                                                                                                                                                    .contact-bottom{
                                                                                                                                                                      display:flex;
                                                                                                                                                                      align-items:end;
                                                                                                                                                                      justify-content:space-between;
                                                                                                                                                                      gap:30px;
                                                                                                                                                                      margin-top:45px}
                                                                                                                                                                      .contact-bottom p{
                                                                                                                                                                        font-size:13px;
                                                                                                                                                                        line-height:1.9;
                                                                                                                                                                        color:#b5c8c6}
                                                                                                                                                                        .email{
                                                                                                                                                                          font-size:clamp(16px,2.3vw,33px);
                                                                                                                                                                          border-bottom:1px solid #809b98;
                                                                                                                                                                          padding-bottom:15px}
                                                                                                                                                                          .email span{
                                                                                                                                                                            margin-left:20px;
                                                                                                                                                                            color:var(--lime)}
                                                                                                                                                                            .copy{
                                                                                                                                                                              display:block;
                                                                                                                                                                              margin:20px 0 0 auto;
                                                                                                                                                                              border:0;
                                                                                                                                                                              color:#b5c8c6;
                                                                                                                                                                              background:none;
                                                                                                                                                                              font-size:11px}
                                                                                                                                                                              #copy-status{
                                                                                                                                                                                text-align:right;
                                                                                                                                                                                font-size:11px;
                                                                                                                                                                                min-height:16px}
                                                                                                                                                                                footer{
                                                                                                                                                                                  padding:35px 5%;
                                                                                                                                                                                  display:flex;
                                                                                                                                                                                  align-items:center;
                                                                                                                                                                                  justify-content:space-between;
                                                                                                                                                                                  gap:20px;
                                                                                                                                                                                  font-size:9px;
                                                                                                                                                                                  color:#a0b4ba}
                                                                                                                                                                                  footer .logo{
                                                                                                                                                                                    color:var(--paper)}
                                                                                                                                                                                    footer div{
                                                                                                                                                                                      display:flex;
                                                                                                                                                                                      gap:20px}
                                                                                                                                                                                      a{
                                                                                                                                                                                        transition:color .2s}
                                                                                                                                                                                        footer a:hover,.social-links a:hover{
                                                                                                                                                                                          color:#69a5a1}
                                                                                                                                                                                          @media(min-width:1600px){
                                                                                                                                                                                            body{
                                                                                                                                                                                              max-width:1800px;
                                                                                                                                                                                              margin:auto}
                                                                                                                                                                                            }
                                                                                                                                                                                            @media(max-width:1000px){
                                                                                                                                                                                              .hero{
                                                                                                                                                                                                gap:20px}
                                                                                                                                                                                                h1{
                                                                                                                                                                                                  font-size:58px}
                                                                                                                                                                                                  .ocean{
                                                                                                                                                                                                    min-height:560px}
                                                                                                                                                                                                    .practice{
                                                                                                                                                                                                      grid-template-columns:1fr;
                                                                                                                                                                                                      gap:45px}
                                                                                                                                                                                                      .section-heading h2 br{
                                                                                                                                                                                                        display:none}
                                                                                                                                                                                                        .art{
                                                                                                                                                                                                          height:300px}
                                                                                                                                                                                                          .about{
                                                                                                                                                                                                            grid-template-columns:1fr 2.5fr}
                                                                                                                                                                                                            .work-heading{
                                                                                                                                                                                                              display:block}
                                                                                                                                                                                                              .contact-bottom{
                                                                                                                                                                                                                display:block}
                                                                                                                                                                                                                .email{
                                                                                                                                                                                                                  display:inline-block;
                                                                                                                                                                                                                  margin-top:15px}
                                                                                                                                                                                                                }
                                                                                                                                                                                                                @media(max-width:680px){
                                                                                                                                                                                                                  header{
                                                                                                                                                                                                                    height:76px;
                                                                                                                                                                                                                    padding:0 6%}
                                                                                                                                                                                                                    nav{
                                                                                                                                                                                                                      gap:17px;
                                                                                                                                                                                                                      font-size:11px}
                                                                                                                                                                                                                      nav a:nth-child(2){
                                                                                                                                                                                                                        display:none}
                                                                                                                                                                                                                        .contact-nav{
                                                                                                                                                                                                                          font-size:10px}
                                                                                                                                                                                                                          .contact-nav span{
                                                                                                                                                                                                                            margin-left:8px}
                                                                                                                                                                                                                            .hero{
                                                                                                                                                                                                                              display:block;
                                                                                                                                                                                                                              padding:40px 6% 0}
                                                                                                                                                                                                                              .hero-copy{
                                                                                                                                                                                                                                padding:5px 0 38px}
                                                                                                                                                                                                                                .eyebrow{
                                                                                                                                                                                                                                  font-size:8px;
                                                                                                                                                                                                                                  letter-spacing:1.5px;
                                                                                                                                                                                                                                  margin-bottom:24px}
                                                                                                                                                                                                                                  h1{
                                                                                                                                                                                                                                    font-size:clamp(43px,10.8vw,70px);
                                                                                                                                                                                                                                    letter-spacing:-2.5px;
                                                                                                                                                                                                                                    margin:30px 0 25px}
                                                                                                                                                                                                                                    .hero-ko{
                                                                                                                                                                                                                                      font-size:21px}
                                                                                                                                                                                                                                      .intro{
                                                                                                                                                                                                                                        font-size:12px}
                                                                                                                                                                                                                                        .ocean{
                                                                                                                                                                                                                                          min-height:440px;
                                                                                                                                                                                                                                          height:440px;
                                                                                                                                                                                                                                          border-radius:45% 45% 0 0}
                                                                                                                                                                                                                                          .ocean svg{
                                                                                                                                                                                                                                            height:auto;
                                                                                                                                                                                                                                            bottom:-40px}
                                                                                                                                                                                                                                            .hero-bottom{
                                                                                                                                                                                                                                              font-size:7px;
                                                                                                                                                                                                                                              gap:20px}
                                                                                                                                                                                                                                              .ticker{
                                                                                                                                                                                                                                                font-size:14px;
                                                                                                                                                                                                                                                padding:20px 15px;
                                                                                                                                                                                                                                                justify-content:flex-start}
                                                                                                                                                                                                                                                .section{
                                                                                                                                                                                                                                                  padding:70px 7%}
                                                                                                                                                                                                                                                  .about{
                                                                                                                                                                                                                                                    display:block}
                                                                                                                                                                                                                                                    .about-bottom{
                                                                                                                                                                                                                                                      grid-template-columns:1fr;
                                                                                                                                                                                                                                                      gap:0;
                                                                                                                                                                                                                                                      margin-top:25px}
                                                                                                                                                                                                                                                      .signature{
                                                                                                                                                                                                                                                        margin-top:25px}
                                                                                                                                                                                                                                                        .practices{
                                                                                                                                                                                                                                                          gap:24px}
                                                                                                                                                                                                                                                          .practices h3{
                                                                                                                                                                                                                                                            font-size:27px;
                                                                                                                                                                                                                                                            margin-top:40px}
                                                                                                                                                                                                                                                            .practices .muted{
                                                                                                                                                                                                                                                              font-size:11px}
                                                                                                                                                                                                                                                              .practices .small{
                                                                                                                                                                                                                                                                font-size:7px}
                                                                                                                                                                                                                                                                .line-icon{
                                                                                                                                                                                                                                                                  font-size:30px}
                                                                                                                                                                                                                                                                  .gallery{
                                                                                                                                                                                                                                                                    grid-template-columns:1fr;
                                                                                                                                                                                                                                                                    gap:25px}
                                                                                                                                                                                                                                                                    .art{
                                                                                                                                                                                                                                                                      height:390px}
                                                                                                                                                                                                                                                                      .gallery article{
                                                                                                                                                                                                                                                                        max-width:480px;
                                                                                                                                                                                                                                                                        width:100%;
                                                                                                                                                                                                                                                                        margin:auto}
                                                                                                                                                                                                                                                                        .orb{
                                                                                                                                                                                                                                                                          top:80px;
                                                                                                                                                                                                                                                                          width:230px;
                                                                                                                                                                                                                                                                          height:230px;
                                                                                                                                                                                                                                                                          left:calc(50% - 115px)}
                                                                                                                                                                                                                                                                          .sculpt{
                                                                                                                                                                                                                                                                            top:60px}
                                                                                                                                                                                                                                                                            .filters{
                                                                                                                                                                                                                                                                              gap:6px}
                                                                                                                                                                                                                                                                              .filters button{
                                                                                                                                                                                                                                                                                padding:9px 15px;
                                                                                                                                                                                                                                                                                font-size:11px}
                                                                                                                                                                                                                                                                                .contact h2{
                                                                                                                                                                                                                                                                                  letter-spacing:-2px}
                                                                                                                                                                                                                                                                                  .email{
                                                                                                                                                                                                                                                                                    font-size:19px}
                                                                                                                                                                                                                                                                                    .email span{
                                                                                                                                                                                                                                                                                      margin-left:8px}
                                                                                                                                                                                                                                                                                      footer{
                                                                                                                                                                                                                                                                                        flex-wrap:wrap;
                                                                                                                                                                                                                                                                                        padding:30px 7%;
                                                                                                                                                                                                                                                                                        gap:25px}
                                                                                                                                                                                                                                                                                        footer div{
                                                                                                                                                                                                                                                                                          width:100%}
                                                                                                                                                                                                                                                                                          footer>a:last-child{
                                                                                                                                                                                                                                                                                            margin-left:auto}
                                                                                                                                                                                                                                                                                            .contact-bottom p{
                                                                                                                                                                                                                                                                                              font-size:12px}
                                                                                                                                                                                                                                                                                            }
                                                                                                                                                                                                                                                                                            @media(prefers-reduced-motion:reduce){
                                                                                                                                                                                                                                                                                              html{
                                                                                                                                                                                                                                                                                                scroll-behavior:auto}
                                                                                                                                                                                                                                                                                                *{
                                                                                                                                                                                                                                                                                                  transition:none!important}
                                                                                                                                                                                                                                                                                                }
```

## Hero SVG 전체

```html
<svg viewBox="0 0 640 780" role="img" aria-label="깊은 바닷속으로 내려가는 다이버의 콘셉트 일러스트">
<defs>
<linearGradient id="sea" x2=".3" y2="1">
<stop stop-color="#8dbdb4"/>
<stop offset=".3" stop-color="#267786"/>
<stop offset="1" stop-color="#062432"/>
</linearGradient>
<radialGradient id="light">
<stop stop-color="#e0f4d8" stop-opacity=".7"/>
<stop offset="1" stop-color="#a1d9ce" stop-opacity="0"/>
</radialGradient>
<filter id="blur">
<feGaussianBlur stdDeviation="15"/>
</filter>
</defs>
<path fill="url(#sea)" d="M0 0h640v780H0z"/>
<ellipse cx="160" cy="20" rx="500" ry="350" fill="url(#light)"/>
<g fill="#d7f1d7" opacity=".13" filter="url(#blur)">
<path d="M90 0 330 780 120 780 30 0z"/>
<path d="M195 0 620 780 450 780 155 0z"/>
<path d="M310 0 640 490 640 660 260 0z"/>
</g>
<g stroke="#c4e9de" fill="none" opacity=".27">
<path d="M0 40Q70 10 135 35T275 30T410 38T640 15"/>
<path d="M0 61Q100 40 180 55T350 51T640 40"/>
</g>
<g transform="translate(340 365) rotate(-29)" fill="#041c27">
<ellipse cx="0" cy="0" rx="12" ry="16"/>
<path d="M-9 12Q-19 37-12 64L-6 89 5 88 12 55 10 17z"/>
<path d="M-9 19-30 49-22 81-16 78-20 49 0 29zM9 21 29 42 20 69 14 65 18 44 2 31z"/>
<path d="M-6 80-18 126-32 159-21 167-3 134 4 91zM3 82 18 117 16 160 28 161 32 116 13 80z"/>
<path d="m-33 152-26 49 18 5 24-47zM16 153l-1 57 20-2-7-55z"/>
</g>
<g fill="#d5efde" opacity=".3">
<circle cx="302" cy="335" r="3"/>
<circle cx="299" cy="316" r="2"/>
<circle cx="305" cy="294" r="4"/>
<circle cx="293" cy="267" r="2"/>
</g>
<path d="M0 740Q100 620 230 731T640 660V780H0" fill="#061f29" opacity=".6"/>
</svg>
```
