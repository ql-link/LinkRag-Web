/* @ds-bundle: {"format":3,"namespace":"ToLinkLinkRagDesignSystem_fa9960","components":[{"name":"Badge","sourcePath":"components/Badge/Badge.jsx"},{"name":"Button","sourcePath":"components/Button/Button.jsx"},{"name":"Card","sourcePath":"components/Card/Card.jsx"}],"sourceHashes":{"components/Badge/Badge.jsx":"3ff0c9df84a8","components/Button/Button.jsx":"ae57dbdbac26","components/Card/Card.jsx":"a8d762fd8f35","ui_kits/marketing/SectionsBottom.jsx":"9b9b16e2b83d","ui_kits/marketing/SectionsTop.jsx":"81f24a964434","ui_kits/workspace/Dashboard.jsx":"2d56a3bff0b2"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.ToLinkLinkRagDesignSystem_fa9960 = window.ToLinkLinkRagDesignSystem_fa9960 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/Badge/Badge.jsx
try { (() => {
/* Badge — compact pill label (Claude editorial).
   Pill radius, sentence/uppercase per tone. Coral = featured/NEW. */

function Badge({
  children,
  tone = 'neutral',
  dot = false,
  icon = null,
  uppercase = false
}) {
  const tones = {
    primary: {
      bg: 'var(--primary)',
      fg: 'var(--on-primary)',
      bd: 'transparent'
    },
    neutral: {
      bg: 'var(--surface-card)',
      fg: 'var(--ink)',
      bd: 'var(--hairline)'
    },
    teal: {
      bg: 'rgba(93,184,166,0.14)',
      fg: '#3f8e7e',
      bd: 'rgba(93,184,166,0.30)'
    },
    amber: {
      bg: 'rgba(232,165,90,0.16)',
      fg: '#b9772d',
      bd: 'rgba(232,165,90,0.32)'
    },
    success: {
      bg: 'rgba(93,184,114,0.14)',
      fg: '#3f8e54',
      bd: 'rgba(93,184,114,0.30)'
    },
    info: {
      bg: 'rgba(91,127,184,0.14)',
      fg: 'var(--info)',
      bd: 'rgba(91,127,184,0.30)'
    },
    error: {
      bg: 'rgba(198,69,69,0.12)',
      fg: 'var(--error)',
      bd: 'rgba(198,69,69,0.26)'
    },
    warning: {
      bg: 'rgba(212,160,23,0.16)',
      fg: '#9a7510',
      bd: 'rgba(212,160,23,0.32)'
    }
  };
  const c = tones[tone] || tones.neutral;
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 12px',
      borderRadius: 'var(--radius-pill)',
      fontFamily: 'var(--font-sans)',
      fontSize: uppercase ? 12 : 13,
      fontWeight: 500,
      textTransform: uppercase ? 'uppercase' : 'none',
      letterSpacing: uppercase ? '0.1em' : 0,
      lineHeight: 1.3,
      background: c.bg,
      color: c.fg,
      border: `1px solid ${c.bd}`
    }
  }, dot && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: 'currentColor',
      flexShrink: 0
    }
  }), icon, children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/Badge/Badge.jsx", error: String((e && e.message) || e) }); }

// components/Button/Button.jsx
try { (() => {
/* Button — Claude (Anthropic) editorial action control.
   Coral primary, humanist-sans label (sentence case, NOT uppercase),
   8px radius. Self-contained; themes via CSS custom properties. */

const {
  useState
} = React;
const BTN_SIZES = {
  sm: {
    padding: '8px 14px',
    fontSize: 13,
    height: 34
  },
  md: {
    padding: '10px 20px',
    fontSize: 14,
    height: 40
  },
  lg: {
    padding: '13px 24px',
    fontSize: 15,
    height: 48
  }
};
function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon = null,
  fullWidth = false,
  disabled = false,
  onClick,
  type = 'button'
}) {
  const [hover, setHover] = useState(false);
  const sz = BTN_SIZES[size] || BTN_SIZES.md;
  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    fontFamily: 'var(--font-sans)',
    fontWeight: 500,
    letterSpacing: 0,
    lineHeight: 1,
    height: sz.height,
    padding: sz.padding,
    fontSize: sz.fontSize,
    border: '1px solid transparent',
    cursor: disabled ? 'not-allowed' : 'pointer',
    borderRadius: 'var(--radius-md)',
    transition: 'background var(--duration-sm) var(--ease-out), border-color var(--duration-sm) var(--ease-out)',
    width: fullWidth ? '100%' : 'auto',
    whiteSpace: 'nowrap'
  };
  const h = hover && !disabled;
  const variants = {
    // Signature coral CTA → darkens on press/hover
    primary: {
      background: disabled ? 'var(--primary-disabled)' : h ? 'var(--primary-active)' : 'var(--primary)',
      color: disabled ? 'var(--muted)' : 'var(--on-primary)'
    },
    // Cream button with hairline outline
    secondary: {
      background: h ? 'var(--surface-soft)' : 'var(--canvas)',
      color: 'var(--ink)',
      borderColor: 'var(--hairline)',
      opacity: disabled ? 0.5 : 1
    },
    // Inline text button, no background
    ghost: {
      background: h ? 'var(--surface-soft)' : 'transparent',
      color: 'var(--ink)',
      opacity: disabled ? 0.5 : 1
    },
    // Coral inline link
    link: {
      background: 'transparent',
      color: 'var(--primary)',
      padding: 0,
      height: 'auto',
      textDecoration: h ? 'underline' : 'none',
      textUnderlineOffset: 3,
      opacity: disabled ? 0.5 : 1
    },
    // Outline (ink)
    outline: {
      background: 'transparent',
      color: 'var(--ink)',
      borderColor: h ? 'var(--ink)' : 'var(--hairline)',
      opacity: disabled ? 0.5 : 1
    },
    // Pill — category/filter tab
    pill: {
      background: h ? 'var(--surface-card)' : 'transparent',
      color: 'var(--muted)',
      borderColor: 'var(--hairline)',
      borderRadius: 'var(--radius-pill)',
      opacity: disabled ? 0.5 : 1
    }
  };
  return /*#__PURE__*/React.createElement("button", {
    type: type,
    disabled: disabled,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      ...base,
      ...(variants[variant] || variants.primary)
    }
  }, icon, children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/Button/Button.jsx", error: String((e && e.message) || e) }); }

// components/Card/Card.jsx
try { (() => {
/* Card — Claude (Anthropic) editorial surface card.
   Color-block first: flat cream (surface-card), dark-navy (product
   mockups), or coral (callout). 12px radius, generous padding, no
   frosted glass. Optional interactive arrow nudge. */

const {
  useState
} = React;
const ARROW = /*#__PURE__*/React.createElement("svg", {
  width: "16",
  height: "16",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "1.8",
  strokeLinecap: "round",
  strokeLinejoin: "round"
}, /*#__PURE__*/React.createElement("path", {
  d: "M5 12h14"
}), /*#__PURE__*/React.createElement("path", {
  d: "M12 5l7 7-7 7"
}));
const SURFACES = {
  card: {
    bg: 'var(--surface-card)',
    bd: 'transparent',
    ink: 'var(--ink)',
    sub: 'var(--body)',
    iconBg: 'var(--canvas)',
    iconFg: 'var(--primary)'
  },
  canvas: {
    bg: 'var(--canvas)',
    bd: 'var(--hairline)',
    ink: 'var(--ink)',
    sub: 'var(--body)',
    iconBg: 'var(--surface-card)',
    iconFg: 'var(--primary)'
  },
  dark: {
    bg: 'var(--surface-dark)',
    bd: 'transparent',
    ink: 'var(--on-dark)',
    sub: 'var(--on-dark-soft)',
    iconBg: 'var(--surface-dark-elevated)',
    iconFg: 'var(--primary)'
  },
  coral: {
    bg: 'var(--primary)',
    bd: 'transparent',
    ink: 'var(--on-primary)',
    sub: 'rgba(255,255,255,0.82)',
    iconBg: 'rgba(255,255,255,0.16)',
    iconFg: 'var(--on-primary)'
  }
};
function Card({
  icon = null,
  title,
  description,
  meta = null,
  variant = 'card',
  // card | canvas | dark | coral
  interactive = false,
  frosted = false,
  // legacy — ignored (color-block now)
  onClick,
  children
}) {
  const [hover, setHover] = useState(false);
  const h = interactive && hover;
  const s = SURFACES[variant] || SURFACES.card;
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      padding: 32,
      borderRadius: 'var(--radius-lg)',
      background: s.bg,
      border: `1px solid ${s.bd}`,
      boxShadow: h ? 'var(--shadow-card-hover)' : 'none',
      cursor: interactive ? 'pointer' : 'default',
      transition: 'box-shadow var(--duration-lg) var(--ease-out), transform var(--duration-lg) var(--ease-out)',
      transform: h ? 'translateY(-2px)' : 'translateY(0)',
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      fontFamily: 'var(--font-sans)'
    }
  }, (icon || interactive) && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start'
    }
  }, icon && /*#__PURE__*/React.createElement("div", {
    style: {
      width: 44,
      height: 44,
      borderRadius: 'var(--radius-md)',
      background: s.iconBg,
      color: s.iconFg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }
  }, icon), interactive && /*#__PURE__*/React.createElement("span", {
    style: {
      color: s.iconFg,
      opacity: h ? 1 : 0.5,
      transform: h ? 'translateX(3px)' : 'translateX(0)',
      transition: 'all var(--duration-md) var(--ease-out)',
      marginTop: 6
    }
  }, ARROW)), title && /*#__PURE__*/React.createElement("h4", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 18,
      fontWeight: 500,
      letterSpacing: 0,
      margin: 0,
      color: s.ink
    }
  }, title), description && /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 15,
      lineHeight: 1.55,
      margin: 0,
      color: s.sub
    }
  }, description), children, meta && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'auto',
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
      letterSpacing: '0.02em',
      color: variant === 'dark' || variant === 'coral' ? s.sub : 'var(--muted)'
    }
  }, meta));
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/Card/Card.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing/SectionsBottom.jsx
try { (() => {
/* Marketing sections (lower) — dark product band, pricing, coral CTA, footer. */

const {
  Button: MKButton,
  Badge: MKBadge
} = window.ToLinkLinkRagDesignSystem_fa9960;
const _serif = window.MK_serif;
const _wrap = window.MK_wrap;
const _Spike = window.MK_Spike;
const _Check = window.MK_IconCheck;
const _Arrow = window.MK_IconArrow;
const _Cpu = window.MK_IconCpu;

/* ─────────────── Dark product band — model config + code window ─────────────── */
function DarkBand() {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--surface-dark)',
      padding: '88px 0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ..._wrap,
      display: 'grid',
      gridTemplateColumns: '0.9fr 1.1fr',
      gap: 56,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 12,
      fontWeight: 500,
      textTransform: 'uppercase',
      letterSpacing: '0.125em',
      color: 'var(--primary)'
    }
  }, "\u5F00\u53D1\u8005\u5E73\u53F0"), /*#__PURE__*/React.createElement("h2", {
    style: {
      ..._serif(40, 1.12),
      color: 'var(--on-dark)',
      marginTop: 14
    }
  }, "\u7528\u4E00\u884C\u4EE3\u7801\uFF0C", /*#__PURE__*/React.createElement("br", null), "\u63A5\u5165\u4F60\u7684\u77E5\u8BC6\u5E93"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 16,
      lineHeight: 1.6,
      color: 'var(--on-dark-soft)',
      marginTop: 18,
      maxWidth: 420
    }
  }, "RESTful API \u4E0E\u6D41\u5F0F\u54CD\u5E94\u5F00\u7BB1\u5373\u7528\u3002\u5728\u4EFB\u610F\u6A21\u578B\u95F4\u5207\u6362\uFF0C\u68C0\u7D22\u3001\u5408\u6210\u3001\u5F15\u7528\u5168\u90E8\u6258\u7BA1\u3002"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 26,
      display: 'flex',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(MKButton, {
    size: "lg"
  }, "\u9605\u8BFB\u6587\u6863"))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-dark-soft)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 12,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 7,
      padding: '14px 18px',
      borderBottom: '1px solid rgba(255,255,255,0.08)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 10,
      height: 10,
      borderRadius: '50%',
      background: '#e0685033'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 10,
      height: 10,
      borderRadius: '50%',
      background: '#ffffff12'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 10,
      height: 10,
      borderRadius: '50%',
      background: '#ffffff12'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 8,
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      color: 'var(--on-dark-soft)'
    }
  }, "query.ts")), /*#__PURE__*/React.createElement("pre", {
    style: {
      margin: 0,
      padding: '20px 22px',
      fontFamily: 'var(--font-mono)',
      fontSize: 13,
      lineHeight: 1.75,
      color: 'var(--on-dark)',
      overflowX: 'auto'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#cc785c'
    }
  }, "const"), " answer = ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#5db8a6'
    }
  }, "await"), " linkrag.", /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#e8a55a'
    }
  }, "query"), "(", '{', '\n', "  dataset: ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#9db88f'
    }
  }, "\"ai-research\""), ",", '\n', "  question: ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#9db88f'
    }
  }, "\"\u5927\u6A21\u578B\u7684\u5173\u952E\u6280\u672F\uFF1F\""), ",", '\n', "  model: ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#9db88f'
    }
  }, "\"claude-opus-4\""), ",", '\n', "  cite: ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#cc785c'
    }
  }, "true"), ",", '\n', '}', ");", '\n', '\n', /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#8e8b82'
    }
  }, '// → { answer, citations[], graph }')))));
}

/* ─────────────── Pricing ─────────────── */
function Pricing() {
  const tiers = [{
    name: 'Free',
    price: '¥0',
    unit: '/月',
    blurb: '个人探索与试用',
    feats: ['3 个知识库', '500 次问答 / 月', '社区支持'],
    cta: '免费开始',
    featured: false
  }, {
    name: 'Pro',
    price: '¥199',
    unit: '/月',
    blurb: '专业知识工作者',
    feats: ['无限知识库', '无限问答', '知识图谱导出', '优先模型接入'],
    cta: '升级 Pro',
    featured: true
  }, {
    name: 'Team',
    price: '联系我们',
    unit: '',
    blurb: '团队与企业部署',
    feats: ['SSO 与权限管理', '私有化部署', '专属支持', 'SLA 保障'],
    cta: '联系销售',
    featured: false
  }];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      ..._wrap,
      padding: '96px 32px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      marginBottom: 48
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: _serif(44, 1.1)
  }, "\u7B80\u5355\u900F\u660E\u7684\u4EF7\u683C"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 16,
      color: 'var(--body)',
      marginTop: 12
    }
  }, "\u968F\u56E2\u961F\u6210\u957F\uFF0C\u968F\u7528\u91CF\u4ED8\u8D39\u3002")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      borderTop: '1px solid var(--hairline)',
      borderBottom: '1px solid var(--hairline)'
    }
  }, tiers.map((t, i) => {
    const feat = t.featured;
    return /*#__PURE__*/React.createElement("div", {
      key: t.name,
      style: {
        position: 'relative',
        padding: '40px 32px',
        borderLeft: i > 0 ? '1px solid var(--hairline)' : 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: 18
      }
    }, feat && /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        top: -1,
        left: 0,
        right: 0,
        height: 2,
        background: 'var(--primary)'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 26
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-sans)',
        fontSize: 22,
        fontWeight: 500,
        color: 'var(--ink)'
      }
    }, t.name), feat && /*#__PURE__*/React.createElement(MKBadge, {
      tone: "primary",
      uppercase: true
    }, "\u63A8\u8350")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'baseline',
        gap: 6
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-serif)',
        fontWeight: 500,
        fontSize: 36,
        letterSpacing: '-0.015em',
        color: 'var(--ink)'
      }
    }, t.price), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-sans)',
        fontSize: 14,
        color: 'var(--muted)'
      }
    }, t.unit)), /*#__PURE__*/React.createElement("p", {
      style: {
        fontFamily: 'var(--font-sans)',
        fontSize: 14,
        color: 'var(--muted)',
        margin: 0
      }
    }, t.blurb), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 1,
        background: 'var(--hairline)'
      }
    }), /*#__PURE__*/React.createElement("ul", {
      style: {
        listStyle: 'none',
        margin: 0,
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 11
      }
    }, t.feats.map(f => /*#__PURE__*/React.createElement("li", {
      key: f,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontFamily: 'var(--font-sans)',
        fontSize: 14,
        color: 'var(--body)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--primary)',
        display: 'flex'
      }
    }, /*#__PURE__*/React.createElement(_Check, {
      s: 16
    })), f))), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 'auto',
        paddingTop: 6
      }
    }, /*#__PURE__*/React.createElement(MKButton, {
      fullWidth: true,
      variant: feat ? 'primary' : 'secondary'
    }, t.cta)));
  })));
}

/* ─────────────── Closing CTA — open cream, coral confined to accent + button ─────────────── */
function CTABand() {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      ..._wrap,
      padding: '24px 32px 112px',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid var(--hairline)',
      paddingTop: 80
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      marginBottom: 22
    }
  }, /*#__PURE__*/React.createElement(_Spike, {
    size: 24,
    color: "var(--primary)"
  })), /*#__PURE__*/React.createElement("h2", {
    style: {
      ..._serif(48, 1.08),
      maxWidth: 640,
      margin: '0 auto'
    }
  }, "\u8BA9\u4F60\u7684\u6587\u6863\u5F00\u53E3\u8BF4\u8BDD"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 18,
      lineHeight: 1.55,
      color: 'var(--body)',
      margin: '18px auto 0',
      maxWidth: 500
    }
  }, "\u51E0\u5206\u949F\u63A5\u5165\uFF0C\u7ACB\u523B\u83B7\u5F97\u5E26\u5F15\u7528\u7684\u667A\u80FD\u95EE\u7B54\u4E0E\u77E5\u8BC6\u56FE\u8C31\u3002"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12,
      justifyContent: 'center',
      marginTop: 34
    }
  }, /*#__PURE__*/React.createElement(MKButton, {
    size: "lg"
  }, "\u514D\u8D39\u8BD5\u7528"), /*#__PURE__*/React.createElement(MKButton, {
    size: "lg",
    variant: "secondary"
  }, "\u9884\u7EA6\u6F14\u793A"))));
}

/* ─────────────── Footer ─────────────── */
function Footer() {
  const cols = [{
    h: '产品',
    items: ['知识库', '知识图谱', '智能问答', '模型配置', 'API']
  }, {
    h: '解决方案',
    items: ['研究团队', '法务合规', '企业知识库', '客户支持']
  }, {
    h: '资源',
    items: ['文档', '更新日志', '状态', '定价']
  }, {
    h: '公司',
    items: ['关于', '博客', '招聘', '联系']
  }];
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      background: 'var(--surface-dark)',
      padding: '64px 0 40px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ..._wrap,
      display: 'grid',
      gridTemplateColumns: '1.4fr repeat(4, 1fr)',
      gap: 32
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 9,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement(_Spike, {
    size: 20,
    color: "#faf9f5"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontWeight: 600,
      fontSize: 21,
      letterSpacing: '-0.02em',
      color: 'var(--on-dark)'
    }
  }, "LinkRag")), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 14,
      lineHeight: 1.6,
      color: 'var(--on-dark-soft)',
      margin: 0,
      maxWidth: 240
    }
  }, "\u77E5\u8BC6\u5408\u6210\u5DE5\u4F5C\u53F0\u3002\u8BFB\u61C2\u4F60\u7684\u6BCF\u4E00\u4EFD\u6587\u6863\u3002")), cols.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.h
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 12,
      fontWeight: 500,
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      color: 'var(--on-dark-soft)',
      marginBottom: 14
    }
  }, c.h), /*#__PURE__*/React.createElement("ul", {
    style: {
      listStyle: 'none',
      margin: 0,
      padding: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, c.items.map(i => /*#__PURE__*/React.createElement("li", {
    key: i
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 14,
      color: 'var(--on-dark)',
      textDecoration: 'none',
      opacity: 0.85
    }
  }, i))))))), /*#__PURE__*/React.createElement("div", {
    style: {
      ..._wrap,
      marginTop: 48,
      paddingTop: 24,
      borderTop: '1px solid rgba(255,255,255,0.1)',
      display: 'flex',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
      color: 'var(--on-dark-soft)'
    }
  }, "\xA9 2026 LinkRag \xB7 ToLink Knowledge Workspace"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
      color: 'var(--on-dark-soft)'
    }
  }, "\u9690\u79C1 \xB7 \u6761\u6B3E \xB7 \u5B89\u5168")));
}
Object.assign(window, {
  MK_DarkBand: DarkBand,
  MK_Pricing: Pricing,
  MK_CTABand: CTABand,
  MK_Footer: Footer
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing/SectionsBottom.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing/SectionsTop.jsx
try { (() => {
/* Marketing sections — LinkRag, in the Claude (Anthropic) editorial style.
   Cream canvas, coral CTAs, serif display, dark-navy product mockups.
   Composes the design-system Button/Badge off the global bundle.
   Exports section components to window for index.html. */

const {
  Button,
  Badge
} = window.ToLinkLinkRagDesignSystem_fa9960;

/* ── Minimal Lucide-style stroke icons (UI glyphs only) ── */
const Ico = p => /*#__PURE__*/React.createElement("svg", {
  width: p.s || 20,
  height: p.s || 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: p.w || 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  style: p.style
}, p.children);
const IconUpload = p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
  d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
}), /*#__PURE__*/React.createElement("path", {
  d: "M14 2v6h6"
}), /*#__PURE__*/React.createElement("path", {
  d: "M12 18v-6"
}), /*#__PURE__*/React.createElement("path", {
  d: "M9 15l3-3 3 3"
}));
const IconGraph = p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("circle", {
  cx: "5",
  cy: "6",
  r: "2.4"
}), /*#__PURE__*/React.createElement("circle", {
  cx: "19",
  cy: "7",
  r: "2.4"
}), /*#__PURE__*/React.createElement("circle", {
  cx: "12",
  cy: "18",
  r: "2.4"
}), /*#__PURE__*/React.createElement("path", {
  d: "M7 7l4 9M17 8.5l-4 7.5"
}));
const IconSpark = p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
  d: "M12 3l1.6 4.8L18 9.4l-4.4 1.6L12 16l-1.6-5L6 9.4l4.4-1.6z"
}));
const IconCpu = p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("rect", {
  x: "6",
  y: "6",
  width: "12",
  height: "12",
  rx: "2"
}), /*#__PURE__*/React.createElement("path", {
  d: "M9 9h6v6H9z"
}), /*#__PURE__*/React.createElement("path", {
  d: "M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2"
}));
const IconArrow = p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
  d: "M5 12h14"
}), /*#__PURE__*/React.createElement("path", {
  d: "M12 5l7 7-7 7"
}));
const IconCheck = p => /*#__PURE__*/React.createElement(Ico, p, /*#__PURE__*/React.createElement("path", {
  d: "M20 6L9 17l-5-5"
}));
const Spike = ({
  size = 18,
  color = '#141413'
}) => /*#__PURE__*/React.createElement("svg", {
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: color,
  "aria-hidden": "true"
}, /*#__PURE__*/React.createElement("path", {
  d: "M12 1.5l1.7 7 5-5-3.3 6.4 7 .9-7 .9 3.3 6.4-5-5-1.7 7-1.7-7-5 5 3.3-6.4-7-.9 7-.9L6 3.5l5 5z"
}));
const wrap = {
  maxWidth: 1200,
  margin: '0 auto',
  padding: '0 32px'
};
const serif = (size, lh = 1.08, ls = '-0.022em') => ({
  fontFamily: 'var(--font-serif)',
  fontWeight: 500,
  fontSize: size,
  lineHeight: lh,
  letterSpacing: ls,
  color: 'var(--ink)',
  margin: 0
});

/* ───────────────────────── Top nav ───────────────────────── */
function TopNav() {
  const links = ['产品', '功能', '解决方案', '价格', '研究'];
  return /*#__PURE__*/React.createElement("header", {
    style: {
      position: 'sticky',
      top: 0,
      zIndex: 20,
      background: 'rgba(250,249,245,0.85)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid var(--hairline)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...wrap,
      height: 64,
      display: 'flex',
      alignItems: 'center',
      gap: 36
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 9
    }
  }, /*#__PURE__*/React.createElement(Spike, {
    size: 20
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontWeight: 600,
      fontSize: 21,
      letterSpacing: '-0.02em',
      color: 'var(--ink)'
    }
  }, "LinkRag")), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      gap: 26,
      flex: 1
    }
  }, links.map(l => /*#__PURE__*/React.createElement("a", {
    key: l,
    href: "#",
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 14,
      fontWeight: 500,
      color: 'var(--body)',
      textDecoration: 'none'
    }
  }, l))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "link"
  }, "\u767B\u5F55"), /*#__PURE__*/React.createElement(Button, null, "\u514D\u8D39\u8BD5\u7528"))));
}

/* ───────────────────────── Hero ───────────────────────── */
function Hero() {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      ...wrap,
      paddingTop: 88,
      paddingBottom: 96,
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 56,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "primary",
    uppercase: true
  }, "\u77E5\u8BC6\u5408\u6210\u5F15\u64CE")), /*#__PURE__*/React.createElement("h1", {
    style: serif(64, 1.04)
  }, "\u8BFB\u61C2\u4F60\u7684", /*#__PURE__*/React.createElement("br", null), "\u6BCF\u4E00\u4EFD\u6587\u6863"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 19,
      lineHeight: 1.55,
      color: 'var(--body)',
      margin: '24px 0 0',
      maxWidth: 480
    }
  }, "LinkRag \u628A PDF\u3001Word\u3001\u6F14\u793A\u7A3F\u5207\u5206\u3001\u5411\u91CF\u5316\uFF0C\u5E76\u8FDE\u6210\u77E5\u8BC6\u56FE\u8C31\u2014\u2014 \u8BA9\u6BCF\u4E2A\u7B54\u6848\u90FD\u5E26\u7740\u53EF\u8FFD\u6EAF\u7684\u5F15\u7528\u3002\u4F60\u7684\u601D\u8003\u4F19\u4F34\uFF0C\u4ECE\u6B64\u771F\u6B63\u7406\u89E3\u4E0A\u4E0B\u6587\u3002"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12,
      marginTop: 32
    }
  }, /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    icon: /*#__PURE__*/React.createElement(IconArrow, {
      s: 17
    })
  }, "\u5F00\u59CB\u6784\u5EFA"), /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    variant: "secondary"
  }, "\u9884\u7EA6\u6F14\u793A")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 20,
      marginTop: 28,
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
      color: 'var(--muted)'
    }
  }, /*#__PURE__*/React.createElement("span", null, "\u514D\u8D39\u989D\u5EA6"), /*#__PURE__*/React.createElement("span", null, "\xB7"), /*#__PURE__*/React.createElement("span", null, "\u65E0\u9700\u4FE1\u7528\u5361"), /*#__PURE__*/React.createElement("span", null, "\xB7"), /*#__PURE__*/React.createElement("span", null, "5 \u5206\u949F\u63A5\u5165"))), /*#__PURE__*/React.createElement(HeroMockup, null));
}

/* Dark product-chrome mockup — the real Knowledge Synthesis Q&A */
function HeroMockup() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-dark)',
      borderRadius: 16,
      padding: 28,
      boxShadow: '0 24px 60px rgba(20,20,19,0.18)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 7,
      marginBottom: 22
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 11,
      height: 11,
      borderRadius: '50%',
      background: '#e0685023'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 11,
      height: 11,
      borderRadius: '50%',
      background: '#ffffff14'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 11,
      height: 11,
      borderRadius: '50%',
      background: '#ffffff14'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 10,
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      color: 'var(--on-dark-soft)',
      letterSpacing: '0.08em'
    }
  }, "KNOWLEDGE SYNTHESIS")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'flex-end',
      marginBottom: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'rgba(204,120,92,0.16)',
      border: '1px solid rgba(204,120,92,0.3)',
      color: 'var(--on-dark)',
      fontSize: 13,
      padding: '10px 16px',
      borderRadius: '12px 12px 2px 12px',
      maxWidth: '78%'
    }
  }, "\u5927\u6A21\u578B\u5728\u81EA\u7136\u8BED\u8A00\u5904\u7406\u4E2D\u7684\u5E94\u7528\u6709\u54EA\u4E9B\uFF1F")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      borderRadius: 8,
      border: '1px solid rgba(255,255,255,0.18)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--primary)',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(IconSpark, {
    s: 16
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontWeight: 500,
      fontSize: 21,
      lineHeight: 1.3,
      color: 'var(--on-dark)',
      borderLeft: '2px solid var(--primary)',
      paddingLeft: 16
    }
  }, "\u5927\u6A21\u578B\u5DF2\u5E7F\u6CDB\u7528\u4E8E\u6587\u672C\u751F\u6210\u3001\u7406\u89E3\u3001\u7FFB\u8BD1\u4E0E\u95EE\u7B54\u7CFB\u7EDF"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14,
      background: 'var(--surface-dark-soft)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 12,
      padding: 14,
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      lineHeight: 1.7,
      color: 'var(--on-dark-soft)'
    }
  }, "01 \u2014 \u6587\u672C\u751F\u6210\uFF1A\u6587\u7AE0\u5199\u4F5C\u3001\u6458\u8981\u3001\u5BF9\u8BDD", /*#__PURE__*/React.createElement("br", null), "02 \u2014 \u6587\u672C\u7406\u89E3\uFF1A\u60C5\u611F\u5206\u6790\u3001\u5B9E\u4F53\u8BC6\u522B", /*#__PURE__*/React.createElement("br", null), "03 \u2014 \u95EE\u7B54\u7CFB\u7EDF\uFF1A\u57FA\u4E8E\u5F15\u7528\u7247\u6BB5\u7684\u5408\u6210"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      marginTop: 14,
      flexWrap: 'wrap'
    }
  }, ['训练的关键技术？', '如何评估性能？'].map(s => /*#__PURE__*/React.createElement("span", {
    key: s,
    style: {
      fontSize: 12,
      color: 'var(--on-dark-soft)',
      border: '1px solid rgba(255,255,255,0.14)',
      borderRadius: 9999,
      padding: '5px 12px'
    }
  }, s))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      marginTop: 22,
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      color: 'var(--on-dark-soft)',
      letterSpacing: '0.06em'
    }
  }, /*#__PURE__*/React.createElement("span", null, "ENGINE \xB7 CLAUDE-OPUS-4"), /*#__PURE__*/React.createElement("span", null, "AI RESPONSE // SYNTHESIZED")));
}

/* ───────────────────────── Logo strip ───────────────────────── */
function LogoStrip() {
  const provs = ['claude-color', 'openai', 'gemini-color', 'deepseek-color', 'qwen-color', 'mistral-color'];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      borderTop: '1px solid var(--hairline)',
      borderBottom: '1px solid var(--hairline)',
      background: 'var(--surface-soft)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...wrap,
      padding: '28px 32px',
      display: 'flex',
      alignItems: 'center',
      gap: 28,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: '0.12em',
      color: 'var(--muted)'
    }
  }, "\u63A5\u5165\u4EFB\u610F\u5927\u6A21\u578B"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 22,
      alignItems: 'center',
      flex: 1,
      flexWrap: 'wrap'
    }
  }, provs.map(p => /*#__PURE__*/React.createElement("img", {
    key: p,
    src: `../../assets/providers/${p}.svg`,
    alt: p,
    style: {
      height: 24,
      opacity: 0.75
    }
  })))));
}

/* ───────────────────────── Feature grid ───────────────────────── */
function Features() {
  const feats = [{
    icon: /*#__PURE__*/React.createElement(IconUpload, {
      s: 26
    }),
    t: '导入即解析',
    d: '拖入 PDF、Word、Markdown、演示稿，自动切分为稳定片段并向量化索引。'
  }, {
    icon: /*#__PURE__*/React.createElement(IconGraph, {
      s: 26
    }),
    t: '知识图谱',
    d: '实体与关系自动连成空间智能图谱，点开任意节点追溯来源文档。'
  }, {
    icon: /*#__PURE__*/React.createElement(IconSpark, {
      s: 26
    }),
    t: '带引用的问答',
    d: '每个回答都基于检索到的片段合成，并标注出处——可信、可追溯。'
  }];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      ...wrap,
      padding: '96px 32px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 620,
      marginBottom: 48
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 12,
      fontWeight: 500,
      textTransform: 'uppercase',
      letterSpacing: '0.125em',
      color: 'var(--primary)'
    }
  }, "\u4E3A\u4EC0\u4E48\u662F LinkRag"), /*#__PURE__*/React.createElement("h2", {
    style: {
      ...serif(44, 1.1),
      marginTop: 14
    }
  }, "\u4ECE\u6587\u6863\u5230\u6D1E\u89C1\uFF0C", /*#__PURE__*/React.createElement("br", null), "\u53EA\u5DEE\u4E00\u6B21\u63D0\u95EE")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 44
    }
  }, feats.map(f => /*#__PURE__*/React.createElement("div", {
    key: f.t,
    style: {
      borderTop: '1px solid var(--hairline)',
      paddingTop: 24,
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--primary)',
      display: 'flex'
    }
  }, f.icon), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 18,
      fontWeight: 500,
      color: 'var(--ink)',
      margin: '2px 0 0'
    }
  }, f.t), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 15,
      lineHeight: 1.55,
      color: 'var(--body)',
      margin: 0
    }
  }, f.d)))));
}
Object.assign(window, {
  MK_TopNav: TopNav,
  MK_Hero: Hero,
  MK_LogoStrip: LogoStrip,
  MK_Features: Features,
  MK_Spike: Spike,
  MK_IconCheck: IconCheck,
  MK_IconArrow: IconArrow,
  MK_IconCpu: IconCpu,
  MK_serif: serif,
  MK_wrap: wrap
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing/SectionsTop.jsx", error: String((e && e.message) || e) }); }

// ui_kits/workspace/Dashboard.jsx
try { (() => {
/* Workspace Dashboard — synced to LinkRag dev branch (Dashboard.tsx).
   Three columns: nav sidebar · Knowledge Synthesis Q&A · graph + vault.
   Re-skinned to the Claude editorial system (cream / coral / serif / dark).
   Exports Dashboard to window for index.html. */

const {
  useState
} = React;
const I = p => /*#__PURE__*/React.createElement("svg", {
  width: p.s || 18,
  height: p.s || 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: p.w || 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  style: p.style
}, p.children);
const Home = p => /*#__PURE__*/React.createElement(I, p, /*#__PURE__*/React.createElement("path", {
  d: "M3 11l9-8 9 8"
}), /*#__PURE__*/React.createElement("path", {
  d: "M5 10v10h14V10"
}));
const Upload = p => /*#__PURE__*/React.createElement(I, p, /*#__PURE__*/React.createElement("path", {
  d: "M12 16V4"
}), /*#__PURE__*/React.createElement("path", {
  d: "M8 8l4-4 4 4"
}), /*#__PURE__*/React.createElement("path", {
  d: "M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
}));
const Msg = p => /*#__PURE__*/React.createElement(I, p, /*#__PURE__*/React.createElement("path", {
  d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
}));
const Share = p => /*#__PURE__*/React.createElement(I, p, /*#__PURE__*/React.createElement("circle", {
  cx: "18",
  cy: "5",
  r: "3"
}), /*#__PURE__*/React.createElement("circle", {
  cx: "6",
  cy: "12",
  r: "3"
}), /*#__PURE__*/React.createElement("circle", {
  cx: "18",
  cy: "19",
  r: "3"
}), /*#__PURE__*/React.createElement("path", {
  d: "M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"
}));
const Spark = p => /*#__PURE__*/React.createElement(I, p, /*#__PURE__*/React.createElement("path", {
  d: "M12 3l1.6 4.8L18 9.4l-4.4 1.6L12 16l-1.6-5L6 9.4l4.4-1.6z"
}));
const Send = p => /*#__PURE__*/React.createElement(I, p, /*#__PURE__*/React.createElement("path", {
  d: "M22 2L11 13"
}), /*#__PURE__*/React.createElement("path", {
  d: "M22 2l-7 20-4-9-9-4z"
}));
const Bell = p => /*#__PURE__*/React.createElement(I, p, /*#__PURE__*/React.createElement("path", {
  d: "M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"
}), /*#__PURE__*/React.createElement("path", {
  d: "M13.7 21a2 2 0 0 1-3.4 0"
}));
const Help = p => /*#__PURE__*/React.createElement(I, p, /*#__PURE__*/React.createElement("circle", {
  cx: "12",
  cy: "12",
  r: "10"
}), /*#__PURE__*/React.createElement("path", {
  d: "M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"
}), /*#__PURE__*/React.createElement("path", {
  d: "M12 17h.01"
}));
const ChevL = p => /*#__PURE__*/React.createElement(I, p, /*#__PURE__*/React.createElement("path", {
  d: "M15 18l-6-6 6-6"
}));
const Arrow = p => /*#__PURE__*/React.createElement(I, p, /*#__PURE__*/React.createElement("path", {
  d: "M5 12h14"
}), /*#__PURE__*/React.createElement("path", {
  d: "M12 5l7 7-7 7"
}));
const mono = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  color: 'var(--muted)'
};

/* ───────── Left nav ───────── */
function NavItem({
  icon,
  label,
  active
}) {
  const [h, setH] = useState(false);
  return /*#__PURE__*/React.createElement("a", {
    href: "#",
    onMouseEnter: () => setH(true),
    onMouseLeave: () => setH(false),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '11px 14px',
      borderRadius: 12,
      textDecoration: 'none',
      position: 'relative',
      transition: 'background 160ms',
      background: active ? 'var(--ink)' : h ? 'var(--surface-soft)' : 'transparent',
      color: active ? 'var(--on-dark)' : 'var(--muted)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: active ? 'var(--primary)' : 'inherit',
      display: 'flex'
    }
  }, icon), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 14,
      fontWeight: 500,
      color: active ? 'var(--on-dark)' : 'var(--body)'
    }
  }, label), active && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      right: 14,
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: 'var(--primary)'
    }
  }));
}
function Sidebar() {
  return /*#__PURE__*/React.createElement("aside", {
    style: {
      width: 220,
      flexShrink: 0,
      background: 'var(--canvas)',
      border: '1px solid var(--hairline)',
      borderRadius: 16,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 72,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '0 22px',
      borderBottom: '1px solid var(--hairline)'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/linkrag-mark-v2.png",
    alt: "",
    style: {
      width: 26,
      height: 26,
      objectFit: 'contain'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontWeight: 600,
      fontSize: 19,
      letterSpacing: '-0.02em',
      color: 'var(--ink)'
    }
  }, "LinkRag")), /*#__PURE__*/React.createElement("nav", {
    style: {
      flex: 1,
      padding: '16px 12px',
      display: 'flex',
      flexDirection: 'column',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement(NavItem, {
    icon: /*#__PURE__*/React.createElement(Home, null),
    label: "\u9996\u9875",
    active: true
  }), /*#__PURE__*/React.createElement(NavItem, {
    icon: /*#__PURE__*/React.createElement(Upload, null),
    label: "\u6587\u4EF6\u4E0A\u4F20"
  }), /*#__PURE__*/React.createElement(NavItem, {
    icon: /*#__PURE__*/React.createElement(Msg, null),
    label: "\u77E5\u8BC6\u95EE\u7B54"
  }), /*#__PURE__*/React.createElement(NavItem, {
    icon: /*#__PURE__*/React.createElement(Share, null),
    label: "\u77E5\u8BC6\u56FE\u8C31"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 16,
      borderTop: '1px solid var(--hairline)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '10px 8px',
      borderRadius: 12,
      background: 'var(--surface-soft)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 32,
      height: 32,
      borderRadius: '50%',
      background: 'var(--primary)',
      opacity: 0.9,
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-sans)',
      fontSize: 13,
      fontWeight: 500,
      color: 'var(--ink)'
    }
  }, "Alex Chen"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      ...mono,
      fontSize: 9
    }
  }, "Pro Member")))));
}

/* ───────── Center: Knowledge Synthesis Q&A ───────── */
function QА() {
  const detail = ['01 — 文本生成：文章写作、摘要、对话系统', '02 — 文本理解：情感分析、文本分类、实体识别', '03 — 机器翻译：更自然准确的翻译结果', '04 — 问答系统：基于知识库的智能问答'];
  return /*#__PURE__*/React.createElement("main", {
    style: {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-card-solid, #fff)',
      border: '1px solid var(--hairline)',
      borderRadius: 16,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("header", {
    style: {
      height: 72,
      padding: '0 32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: '1px solid var(--hairline)'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      ...mono,
      color: 'var(--primary)'
    }
  }, "Active Intelligence"), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: '2px 0 0',
      fontFamily: 'var(--font-serif)',
      fontWeight: 500,
      fontSize: 24,
      letterSpacing: '-0.015em',
      color: 'var(--ink)'
    }
  }, "Knowledge Synthesis")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 20,
      color: 'var(--muted)'
    }
  }, /*#__PURE__*/React.createElement(Help, {
    s: 18
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 1,
      height: 16,
      background: 'var(--hairline)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement(Bell, {
    s: 18
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: -2,
      right: -2,
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: 'var(--primary)'
    }
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto',
      padding: '40px 48px',
      display: 'flex',
      flexDirection: 'column',
      gap: 36
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      ...mono,
      border: '1px solid var(--hairline)',
      borderRadius: 9999,
      padding: '7px 16px'
    }
  }, "System Initiated // Node Analysis")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--primary-light, rgba(204,120,92,0.1))',
      border: '1px solid rgba(204,120,92,0.22)',
      color: 'var(--ink)',
      fontSize: 14,
      padding: '14px 18px',
      borderRadius: '14px 14px 2px 14px',
      maxWidth: '78%'
    }
  }, "\u5927\u6A21\u578B\u5728\u81EA\u7136\u8BED\u8A00\u5904\u7406\u4E2D\u7684\u5E94\u7528\u6709\u54EA\u4E9B\uFF1F"), /*#__PURE__*/React.createElement("span", {
    style: mono
  }, "User Query // 09:24")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 40,
      height: 40,
      borderRadius: 10,
      border: '1px solid var(--ink)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      color: 'var(--ink)'
    }
  }, /*#__PURE__*/React.createElement(Spark, {
    s: 18
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontWeight: 500,
      fontSize: 24,
      lineHeight: 1.35,
      letterSpacing: '-0.01em',
      color: 'var(--ink)',
      borderLeft: '2px solid var(--primary)',
      paddingLeft: 22
    }
  }, "\u5927\u6A21\u578B\u5DF2\u5E7F\u6CDB\u5E94\u7528\u4E8E\u6587\u672C\u751F\u6210\u3001\u7406\u89E3\u3001\u7FFB\u8BD1\u4E0E\u95EE\u7B54\u7CFB\u7EDF"), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-soft)',
      border: '1px solid var(--hairline)',
      borderRadius: 12,
      padding: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: 6
    }
  }, detail.map(d => /*#__PURE__*/React.createElement("div", {
    key: d,
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      color: 'var(--body)',
      lineHeight: 1.5
    }
  }, d))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      flexWrap: 'wrap'
    }
  }, ['大模型训练的关键技术是什么？', '如何评估大模型的性能？'].map(s => /*#__PURE__*/React.createElement("button", {
    key: s,
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 13,
      fontWeight: 500,
      color: 'var(--body)',
      background: 'transparent',
      border: '1px solid var(--hairline)',
      borderRadius: 9999,
      padding: '7px 14px',
      cursor: 'pointer'
    }
  }, s)))))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '20px 48px',
      borderTop: '1px solid var(--hairline)',
      background: 'var(--surface-soft)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("input", {
    placeholder: "\u8F93\u5165\u4F60\u7684\u95EE\u9898\u2026",
    style: {
      width: '100%',
      background: '#fff',
      border: '1px solid var(--hairline)',
      borderRadius: 12,
      padding: '18px 64px 18px 20px',
      fontFamily: 'var(--font-sans)',
      fontSize: 14,
      color: 'var(--ink)',
      outline: 'none'
    }
  }), /*#__PURE__*/React.createElement("button", {
    style: {
      position: 'absolute',
      right: 8,
      top: '50%',
      transform: 'translateY(-50%)',
      width: 44,
      height: 44,
      borderRadius: 8,
      background: 'var(--primary)',
      color: '#fff',
      border: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(Send, {
    s: 18
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: mono
  }, "Engine \xB7 Claude-Opus-4"), /*#__PURE__*/React.createElement("span", {
    style: mono
  }, "Press Enter to Transmit"))));
}

/* ───────── Right: graph + vault ───────── */
const GNODES = [{
  x: 50,
  y: 28,
  label: '大模型',
  core: true
}, {
  x: 22,
  y: 14,
  label: '自然语言处理'
}, {
  x: 80,
  y: 16,
  label: '核心技术'
}, {
  x: 84,
  y: 52,
  label: '应用场景'
}, {
  x: 18,
  y: 56,
  label: '评估方法'
}, {
  x: 40,
  y: 74,
  label: '文本生成'
}, {
  x: 70,
  y: 80,
  label: '对话系统'
}];
const GLINKS = [[0, 1], [0, 2], [0, 3], [0, 4], [1, 5], [3, 6]];
function Graph() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      height: '100%',
      background: 'var(--surface-soft)',
      border: '1px solid var(--hairline)',
      borderRadius: 12,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    style: {
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%'
    }
  }, GLINKS.map(([a, b], i) => /*#__PURE__*/React.createElement("line", {
    key: i,
    x1: `${GNODES[a].x}%`,
    y1: `${GNODES[a].y}%`,
    x2: `${GNODES[b].x}%`,
    y2: `${GNODES[b].y}%`,
    stroke: "var(--ink)",
    strokeOpacity: "0.12",
    strokeWidth: "1",
    strokeDasharray: "2,2"
  }))), GNODES.map(n => /*#__PURE__*/React.createElement("div", {
    key: n.label,
    style: {
      position: 'absolute',
      left: `${n.x}%`,
      top: `${n.y}%`,
      transform: 'translate(-50%,-50%)',
      fontFamily: 'var(--font-mono)',
      fontSize: 9,
      fontWeight: 700,
      letterSpacing: '0.04em',
      whiteSpace: 'nowrap',
      padding: '4px 9px',
      borderRadius: 9999,
      border: '1px solid var(--ink)',
      background: n.core ? 'var(--ink)' : 'var(--canvas)',
      color: n.core ? 'var(--on-dark)' : 'var(--ink)'
    }
  }, n.label)), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 14,
      left: 14,
      display: 'flex',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      ...mono,
      fontSize: 9
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      background: 'var(--ink)'
    }
  }), "Core Node"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      ...mono,
      fontSize: 9
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      border: '1px solid var(--ink)'
    }
  }), "Entity")));
}
const FILES = [{
  t: 'PDF',
  n: '人工智能发展报告.pdf'
}, {
  t: 'DOCX',
  n: '大模型技术综述.docx'
}, {
  t: 'PPTX',
  n: '自然语言处理导论.pptx'
}];
function Vault() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, FILES.map(f => {
    const [h, setH] = useState(false);
    return /*#__PURE__*/React.createElement("div", {
      key: f.n,
      onMouseEnter: () => setH(true),
      onMouseLeave: () => setH(false),
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        padding: '11px 14px',
        borderRadius: 12,
        border: '1px solid var(--hairline)',
        background: h ? 'var(--surface-soft)' : 'var(--canvas)',
        cursor: 'pointer'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 26,
        height: 26,
        borderRadius: 6,
        border: '1px solid var(--hairline)',
        background: 'var(--primary-light, rgba(204,120,92,0.1))',
        color: 'var(--primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-mono)',
        fontSize: 8,
        fontWeight: 700,
        flexShrink: 0
      }
    }, f.t), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-sans)',
        fontSize: 13,
        fontWeight: 500,
        color: 'var(--ink)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }
    }, f.n)), /*#__PURE__*/React.createElement("span", {
      style: {
        color: h ? 'var(--primary)' : 'var(--muted)',
        flexShrink: 0,
        transform: h ? 'translateX(2px)' : 'none',
        transition: 'all 160ms'
      }
    }, /*#__PURE__*/React.createElement(Arrow, {
      s: 14
    })));
  }));
}
function RightPanel() {
  return /*#__PURE__*/React.createElement("aside", {
    style: {
      width: 340,
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--canvas)',
      border: '1px solid var(--hairline)',
      borderRadius: 16,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '20px 22px 8px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: mono
  }, "Spatial Intelligence Map"), /*#__PURE__*/React.createElement("button", {
    style: {
      ...mono,
      fontSize: 9,
      background: 'none',
      border: 'none',
      cursor: 'pointer'
    }
  }, "Expand")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      padding: '8px 16px 16px'
    }
  }, /*#__PURE__*/React.createElement(Graph, null))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: '42%',
      display: 'flex',
      flexDirection: 'column',
      borderTop: '1px solid var(--hairline)',
      background: 'var(--surface-soft)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '18px 22px',
      borderBottom: '1px solid var(--hairline)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: mono
  }, "Knowledge Vault"), /*#__PURE__*/React.createElement("button", {
    style: {
      ...mono,
      fontSize: 9,
      background: 'none',
      border: 'none',
      cursor: 'pointer'
    }
  }, "See Archive")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto',
      padding: '14px 18px'
    }
  }, /*#__PURE__*/React.createElement(Vault, null))));
}
function Dashboard() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      height: '100vh',
      gap: 16,
      padding: 16,
      background: 'var(--canvas)',
      boxSizing: 'border-box'
    }
  }, /*#__PURE__*/React.createElement(Sidebar, null), /*#__PURE__*/React.createElement(QА, null), /*#__PURE__*/React.createElement(RightPanel, null));
}
Object.assign(window, {
  WK_Dashboard: Dashboard
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/workspace/Dashboard.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

})();
