# MI-Proc — Pages, Components & Child Components

A visual map of every route, the page it renders, and that page's component tree down to
shared UI primitives. Generated from the route table (`src/router.tsx`) and the feature
folders under `src/features/*`, `src/app/*`, and `src/shared/ui/*`.

> Diagrams are [Mermaid](https://mermaid.js.org). They render in VS Code's Markdown preview
> and on GitHub. Re-render after changing the component tree.

**Legend**

| Style | Meaning |
| --- | --- |
| 🟦 Route | A path in `createBrowserRouter` |
| 🟩 Page | Top-level routed component |
| 🟪 Layout / chrome | Shell + shared navigation (`PublicLayout`, `PortalLayout`, `SiteHeader`, …) |
| ⬜ Feature component | Component owned by a `src/features/*` slice |
| 🟨 Shared UI | Reusable primitive from `src/shared/ui/*` |
| ⚙️ Platform / hook | Cross-cutting context or data hook (`useAuth`, `useRfqs`, …) |

---

## 1. Route map

How `createBrowserRouter` wires paths to pages, including guards and layout shells.

```mermaid
flowchart TD
  R(["createBrowserRouter — src/router.tsx"])

  R --> r1["/"]
  R --> r2["/login"]
  R --> r3["/register"]
  R --> r4["/buyer/*"]
  R --> r5["/dev/buttons"]
  R --> r6["/dev/inputs"]
  R --> r7["/dev/fields"]
  R --> r8["* — catch-all"]

  r1 --> Landing["LandingPage"]
  r2 --> PubL["PublicLayout"] --> Login["LoginPage"]
  r3 --> Register["RegisterPage<br/>(own full-screen shell)"]
  r4 --> Guard["RequireAuth"] --> PortL["PortalLayout"] --> Buyer["5 buyer pages"]
  r5 --> BtnShow["ButtonShowcase"]
  r6 --> InpShow["InputShowcase"]
  r7 --> FldShow["FieldShowcase"]
  r8 --> NF["NotFoundPage"]

  classDef route fill:#1e293b,stroke:#475569,color:#fff
  classDef page fill:#0d9488,stroke:#0f766e,color:#fff
  classDef layout fill:#9333ea,stroke:#7e22ce,color:#fff
  class r1,r2,r3,r4,r5,r6,r7,r8 route
  class Landing,Login,Register,BtnShow,InpShow,FldShow,NF,Buyer page
  class PubL,PortL,Guard layout
```

---

## 2. Landing page (`/`)

```mermaid
flowchart TD
  LP["LandingPage"]

  LP --> SH["SiteHeader"]
  LP --> LHero["LandingHero"]
  LP --> LFeat["LandingFeatures"]
  LP --> LAud["LandingAudience"]
  LP --> LCta["LandingCta"]
  LP --> LFoot["LandingFooter"]

  SH --> SHlogo["BrandLogo"]
  SH --> HN["HeaderNav"]
  SH --> SHlang["LanguageToggle"]
  SH --> SHcta["ShimmerButton ×2<br/>Sign in · Get Started"]
  HN --> HNsb["ShimmerButton ×N<br/>nav links"]

  LHero --> LHrev["Reveal"]
  LHero --> LHcta["CTA links"]
  LFeat --> LFrev["Reveal ×N"]
  LAud --> LArev["Reveal"]
  LAud --> LAcard["AudienceCard ×2<br/>(internal)"]
  LCta --> LCrev["Reveal"]
  LFoot --> LFlang["LanguageToggle"]

  classDef page fill:#0d9488,stroke:#0f766e,color:#fff
  classDef chrome fill:#9333ea,stroke:#7e22ce,color:#fff
  classDef feat fill:#334155,stroke:#64748b,color:#fff
  classDef shared fill:#f59e0b,stroke:#b45309,color:#111
  classDef plat fill:#475569,stroke:#94a3b8,color:#fff
  class LP page
  class SH,HN chrome
  class LHero,LFeat,LAud,LCta,LFoot,LAcard,LHcta feat
  class SHlogo,SHcta,HNsb,LHrev,LFrev,LArev,LCrev shared
  class SHlang,LFlang plat
```

---

## 3. Auth — Login (`/login`) & Register (`/register`)

`LoginPage` is a 3-step state machine: it renders exactly one card per step
(verify identity → choose role → enter that role's PIN).

```mermaid
flowchart TD
  PubL["PublicLayout<br/>(SiteHeader, showLinks=false)"] --> Login["LoginPage<br/>step machine"]

  Login -->|step: credentials| Cred["CredentialsCard"]
  Login -->|step: continueAs| Cont["ContinueAsCard"]
  Login -->|step: pin| Pin["RolePinCard"]

  Cred --> Cred_logo["BrandLogo"]
  Cred --> Cred_field["Field ×2<br/>email · password"]
  Cred --> Cred_btn["Button"]
  Cred --> Cred_trace["TracingBorder"]
  Cred --> Cred_g["useGoogleSignIn"]
  Cred --> Cred_icons["authIcons"]
  Cont --> Cont_icons["authIcons"]
  Pin --> Pin_btn["Button"]

  Reg["RegisterPage<br/>(own full-screen shell)"]
  Reg --> R_logo["BrandLogo"]
  Reg --> R_field["Field ×4<br/>name · email · company · password"]
  Reg --> R_btn["Button"]
  Reg --> R_trace["TracingBorder"]
  Reg --> R_icons["authIcons"]

  classDef page fill:#0d9488,stroke:#0f766e,color:#fff
  classDef chrome fill:#9333ea,stroke:#7e22ce,color:#fff
  classDef feat fill:#334155,stroke:#64748b,color:#fff
  classDef shared fill:#f59e0b,stroke:#b45309,color:#111
  classDef plat fill:#475569,stroke:#94a3b8,color:#fff
  class Login,Reg page
  class PubL chrome
  class Cred,Cont,Pin,Cred_icons,Cont_icons,R_icons feat
  class Cred_logo,Cred_field,Cred_btn,Cred_trace,Pin_btn,R_logo,R_field,R_btn,R_trace shared
  class Cred_g plat
```

---

## 4. Buyer portal (`/buyer/*`, auth-gated)

`RequireAuth` gates the branch; `PortalLayout` provides the sidebar + topbar shell and
renders one of five pages through its outlet.

```mermaid
flowchart TD
  Guard["RequireAuth"] --> PortL["PortalLayout"]

  PortL --> PL_logo["BrandLogo"]
  PortL --> PL_lang["LanguageToggle"]
  PortL --> Dash["DashboardPage<br/>/buyer"]
  PortL --> Cat["CataloguePage<br/>/buyer/catalogue"]
  PortL --> RfqL["RfqListPage<br/>/buyer/rfqs"]
  PortL --> RfqC["RfqCreatePage<br/>/buyer/rfqs/new"]
  PortL --> Settle["SettlementPage<br/>/buyer/settlement"]

  Dash --> Dash_auth["useAuth"]
  Cat --> Cat_hook["useCatalogue"]
  RfqL --> RfqL_hook["useRfqs"]
  RfqL --> RfqL_btn["Button"]
  RfqC --> RfqC_hook["useCreateRfq"]
  RfqC --> RfqC_field["Field"]
  RfqC --> RfqC_btn["Button"]
  Settle --> Settle_ph["PagePlaceholder"]

  classDef page fill:#0d9488,stroke:#0f766e,color:#fff
  classDef chrome fill:#9333ea,stroke:#7e22ce,color:#fff
  classDef shared fill:#f59e0b,stroke:#b45309,color:#111
  classDef plat fill:#475569,stroke:#94a3b8,color:#fff
  class Dash,Cat,RfqL,RfqC,Settle page
  class Guard,PortL chrome
  class PL_logo,RfqL_btn,RfqC_field,RfqC_btn,Settle_ph shared
  class PL_lang,Dash_auth,Cat_hook,RfqL_hook,RfqC_hook plat
```

---

## 5. Dev showcases, NotFound & unwired components

```mermaid
flowchart TD
  Btn["ButtonShowcase<br/>/dev/buttons"] --> Btn_b["Button"]
  Inp["InputShowcase<br/>/dev/inputs"] --> Inp_i["Input"]
  Fld["FieldShowcase<br/>/dev/fields"] --> Fld_f["Field"]
  Fld --> Fld_b["Button"]
  Fld --> Fld_i["Input"]
  Fld --> Fld_demo["InteractiveDemo<br/>(internal)"]
  NF["NotFoundPage<br/>*"] --> NF_links["links only"]

  subgraph Unwired["Defined but not on any route yet"]
    AuthCard["AuthCard<br/>(auth card chrome)"]
    Valid["ValidationCard<br/>(onboarding CR/VAT)"]
    Valid --> Valid_btn["Button"]
    Valid --> Valid_inp["Input"]
  end

  classDef page fill:#0d9488,stroke:#0f766e,color:#fff
  classDef feat fill:#334155,stroke:#64748b,color:#fff
  classDef shared fill:#f59e0b,stroke:#b45309,color:#111
  class Btn,Inp,Fld,NF page
  class Fld_demo,AuthCard,Valid feat
  class Btn_b,Inp_i,Fld_f,Fld_b,Fld_i,Valid_btn,Valid_inp shared
```

---

## 6. Shared UI primitives (`src/shared/ui/*`)

The leaf layer. Each is reused across features; this is where the design system lives.

| Primitive | Path | Used by |
| --- | --- | --- |
| `Button` | `Button/Button.tsx` | CredentialsCard, RolePinCard, RegisterPage, RfqListPage, RfqCreatePage, ValidationCard, dev showcases |
| `Input` | `Input/Input.tsx` | Field (internally), ValidationCard, dev showcases |
| `Field` | `Field/Field.tsx` | CredentialsCard, RegisterPage, RfqCreatePage, dev showcase |
| `BrandLogo` | `BrandLogo/BrandLogo.tsx` | SiteHeader, PortalLayout, CredentialsCard, RegisterPage |
| `ShimmerButton` | `ShimmerButton/ShimmerButton.tsx` | HeaderNav (hover), SiteHeader CTAs (click) |
| `Reveal` | `Reveal.tsx` | LandingHero, LandingFeatures, LandingAudience, LandingCta |
| `TracingBorder` | `TracingBorder.tsx` | CredentialsCard, RegisterPage (submit loaders) |
| `PagePlaceholder` | `PagePlaceholder.tsx` | SettlementPage |
| `RisingBars` | `RisingBars/RisingBars.tsx` | _(currently unused — superseded by ShimmerButton in the nav)_ |

---

## 7. Layouts, chrome & platform

| Item | Path | Role |
| --- | --- | --- |
| `PublicLayout` | `src/app/layouts/PublicLayout.tsx` | Unauthenticated shell: `SiteHeader` + centered outlet (login) |
| `PortalLayout` | `src/app/layouts/PortalLayout.tsx` | Authenticated shell: sidebar nav + topbar + outlet (buyer) |
| `SiteHeader` | `src/app/components/SiteHeader.tsx` | Top nav on landing + auth surfaces |
| `HeaderNav` | `src/app/components/HeaderNav.tsx` | Marketing nav links (ShimmerButton) |
| `RequireAuth` | `src/platform/auth/guards.tsx` | Route guard for `/buyer/*` |
| `LanguageToggle` | `src/platform/i18n/LanguageToggle.tsx` | EN/AR + RTL switcher (header & footer) |
| `useAuth`, `useTenant` | `src/platform/*` | Auth + tenant/branding context |
| `useCatalogue`, `useRfqs`, `useCreateRfq`, `useGoogleSignIn` | `src/features/*` | Per-feature data/effect hooks |

---

## 8. Component → file reference

| Component | Path |
| --- | --- |
| LandingPage | `src/features/marketing/LandingPage.tsx` |
| LandingHero / Features / Audience / Cta / Footer | `src/features/marketing/components/*.tsx` |
| LoginPage | `src/features/auth/LoginPage.tsx` |
| CredentialsCard / ContinueAsCard / RolePinCard / AuthCard | `src/features/auth/components/*.tsx` |
| authIcons | `src/features/auth/components/authIcons.tsx` |
| RegisterPage | `src/features/auth/RegisterPage.tsx` |
| DashboardPage | `src/features/dashboard/DashboardPage.tsx` |
| CataloguePage | `src/features/catalogue/CataloguePage.tsx` |
| RfqListPage / RfqCreatePage | `src/features/rfq/*.tsx` |
| SettlementPage | `src/features/settlement/SettlementPage.tsx` |
| ValidationCard | `src/features/onboarding/components/ValidationCard.tsx` |
| ButtonShowcase / InputShowcase / FieldShowcase | `src/dev/*.tsx` |
| NotFoundPage | `src/app/NotFoundPage.tsx` |

> **Note:** child counts like “Field ×2” / “ShimmerButton ×N” denote repeated instances,
> not distinct components. `AuthCard`, `ValidationCard`, and `RisingBars` exist in the
> codebase but aren't wired into any current route.
