# CLAUDE.md — dikym Portfolio

Single-page personal portfolio site (Hero, About, Skills, Projects, Contact, Arcade).

## Tech Stack

- **Framework:** React 19, TypeScript 5.8 (strict)
- **Build:** Vite 7 (`@vitejs/plugin-react`)
- **Styling:** Tailwind CSS v4 (via `@tailwindcss/vite`), `prettier-plugin-tailwindcss` for class sorting
- **Icons:** inline SVG components and skill logos in `public/icons/`
- **Tooling:** ESLint 9 (typescript-eslint, react-hooks, react-refresh), Prettier, Husky + lint-staged

## Project Structure

```
src/
├── App.tsx              # Page composition, mobile menu state
├── main.tsx             # Entry point
├── style.css            # Tailwind entry
├── components/
│   ├── arcade/          # SpaceInvaders, CrabSprite
│   ├── layout/          # Navigation, MobileMenu, Footer, Curtain
│   ├── sections/        # Hero, About, Skills, Projects, Contact, Arcade
│   └── ui/              # Small reusable pieces (ProjectCard, SkillCard, SocialLinks)
├── data/                # Static content (projectsData, skillsData)
├── game/                # Space Invaders engine, sprites, ROM, CPU, audio
├── hooks/               # Navigation, scroll position, reveal and scrub hooks
└── types/               # Shared interfaces (Skill, SkillCategory, Project, NavigationItem)

public/                  # Icons, fonts, audio, licenses, favicon, social preview
tests/                   # Browser and engine checks, with independent fixtures
docs/                    # Space Invaders sources and implementation notes
```

## Conventions

- Use function components with hooks. Keep components typed (props interfaces or `React.FC`).
- Put shared types in `src/types/index.ts`; import them with `import type`.
- Content (projects, skills) lives in `src/data/`. Edit data there, not inside components.
- Style with Tailwind utility classes. Avoid custom CSS unless strictly necessary.
- Formatting: 4-space indent, double quotes, semicolons, `trailingComma: "es5"`, `arrowParens: "avoid"` (see
  `.prettierrc`).

## Code Quality

**IMPORTANT:** Never disable or bypass the linter or type checker (`// @ts-ignore`, `// @ts-expect-error`,
`/* eslint-disable */`, etc.) without explicit user instruction. Fix the code instead.

After creating, changing, or deleting code, you **MUST** run:

```bash
npm run format    # Prettier
npm run lint      # ESLint
npm run build     # tsc -b type check + Vite build
```

A Husky pre-commit hook runs lint-staged (Prettier on staged files, ESLint on `*.ts`/`*.tsx`).

## Git Commits

**Must** follow [Conventional Commits](https://www.conventionalcommits.org/). Do not add a `Co-Authored-By` trailer or
any AI attribution line.

### Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

| Type       | When to use                                     |
| ---------- | ----------------------------------------------- |
| `feat`     | New feature                                     |
| `fix`      | Bug fix                                         |
| `docs`     | Documentation only                              |
| `style`    | Formatting/whitespace, no<br/> logic change     |
| `refactor` | Code restructuring, neither feature nor bug fix |
| `test`     | Add or change tests                             |
| `chore`    | Maintenance: deps, config, tooling              |
| `build`    | Build system or external dependency changes     |
| `ci`       | CI/CD config changes                            |
| `perf`     | Performance improvement                         |

### Examples

```bash
feat(projects): add project filter by tech
fix(navigation): highlight correct section on scroll
refactor(hero): rewrite headline and intro copy
chore: update tailwindcss to v4.1
```

### Rules

- **Confirm before committing:** once the change is done and verified, **ALWAYS** ask the user before running `git add`
  and `git commit`. Never commit without explicit approval. Propose a Conventional Commits message for review first.
- Skip the body when the subject already describes the whole change.
- Use lowercase for type and description.
- Keep the description short and imperative, with no trailing period.
- Scope is optional; use the module/area name (e.g. `hero`, `about`, `projects`, `skills`, `navigation`).
- Breaking changes: add `!` after type/scope, e.g. `feat!: remove legacy contact form`.
