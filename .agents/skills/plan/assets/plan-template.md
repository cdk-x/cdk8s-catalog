## Technical Plan

### Architecture
[Key architectural decisions: which patterns are used, which abstractions introduced, and why. Omit if the feature is purely additive with no structural impact.]

### Modules
| Module | Action | Notes |
|--------|--------|-------|
| `packages/foo` | modify | [what changes and why] |
| `packages/bar` | create | [what it will contain] |

### Data Model
[Entity changes, schema migrations, new relationships. Omit if data structures are unchanged.]

### Interface Contracts
[Public APIs between packages or services introduced or modified — e.g. a new class method, a CLI command signature, a cross-package event. Omit if the feature is self-contained within a single module or skill. Do NOT use this section for internal implementation details, helper script I/O formats, or data transformations.]

### Phases
- **Phase 1** (tracer bullet): [Thin vertical slice — end-to-end, demoable, validates the architecture choice early]
- **Phase 2**: [Happy-path expansion]
- **Phase N**: [Polish, edge cases, non-functional requirements]

### Assumptions
[Unknowns you couldn't resolve, stated as explicit assumptions. Remove this section if there are none.]

### Project Rules Check
- [x] [Rule from project constitution] — brief note
- [ ] [Any deviation] — explicit justification
