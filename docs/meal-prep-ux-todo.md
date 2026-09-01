# Meal Prep UX TODO

Evaluation of the existing Meal Prep flow using the highest-impact principles from [Laws of UX](https://lawsofux.com/).

Flow evaluated:

`Home → Preparar → saved-week overview → Ajustar → meal selection → kitchen preferences → Kitchen Mode`

Priority definitions:

- **P0:** Blocks a coherent experience and should be fixed before shipping.
- **P1:** High-impact improvement.
- **P2:** Valuable refinement.

## P0

- [x] **Add a proper completed-session state**
  - **Current issue:** Reopening a completed session shows `15 de 15` on the final task with a `Siguiente` button that does not lead anywhere.
  - **Suggestion:** After the last task—or when opening an already completed session—show a completion screen with:
    - `Sesión terminada`
    - A summary of what was prepared and where it was stored
    - The next scheduled session
    - A clear `Volver a preparación` action
  - **Laws:** [Peak-End Rule](https://lawsofux.com/peak-end-rule/), [Goal-Gradient Effect](https://lawsofux.com/goal-gradient-effect/)
  - **Why:** The ending disproportionately shapes how the experience is remembered. The current ending feels broken or unfinished at the moment that should be most rewarding.

## P1

- [x] **Restructure the prepared-week page around the user's next action**
  - **Current issue:** The page becomes a long feed containing sessions, stored portions, and 54 individual `al momento` instructions.
  - **Suggestion:** Keep the next session and today's instructions expanded. Collapse the rest into day-based summaries such as:
    - `Martes · 8 instrucciones`
    - `12 porciones guardadas`
  - **Laws:** [Cognitive Load](https://lawsofux.com/cognitive-load/), [Chunking](https://lawsofux.com/chunking/)
  - **Why:** Users usually arrive with a narrow goal—what to do now. Showing the entire week forces them to filter and remember information that is not currently relevant.

- [x] **Reduce choice overload in meal selection**
  - **Current issue:** Step 1 presents 24 checked meal slots across six days, including many repeated meals and no day-level controls.
  - **Suggestion:** Add selection shortcuts:
    - `Todo el día`
    - `Solo comidas principales`
    - `Limpiar selección`
    - Collapsible day sections
    - A recommended initial selection instead of automatically exposing every slot
  - **Laws:** [Hick's Law](https://lawsofux.com/hicks-law/), [Choice Overload](https://lawsofux.com/choice-overload/)
  - **Why:** Decision time increases with the number and complexity of choices. Repeated individual decisions make the step feel much larger than it is.

- [x] **Generate a recommended plan before asking for detailed configuration**
  - **Current issue:** Users must review session dates, time limits, preparation style, freezer availability, and equipment before seeing a proposed result, even though defaults already exist.
  - **Suggestion:** Generate a recommended plan from saved or sensible defaults and place the current configuration controls behind `Personalizar preparación`. Remember the user's preferences for future weeks.
  - **Law:** [Tesler's Law](https://lawsofux.com/teslers-law/)
  - **Why:** Some complexity is unavoidable, but the system should absorb as much of it as possible. Most users should only need to approve a sensible recommendation.

- [x] **Keep setup progress and the next action visible**
  - **Current issue:** The setup only shows `1 / 3`, while the first step spans several screens and the continuation button appears at the bottom.
  - **Suggestion:** Add:
    - A sticky footer such as `24 comidas seleccionadas · Continuar`
    - A persistent three-step progress indicator
    - An estimated setup time such as `≈ 1 minuto`
  - **Laws:** [Goal-Gradient Effect](https://lawsofux.com/goal-gradient-effect/), [Fitts's Law](https://lawsofux.com/fittss-law/)
  - **Why:** Users cannot easily see how close they are to advancing. Keeping the next action visible improves momentum and reduces scrolling effort.

- [x] **Surface assumptions before the long draft review**
  - **Current issue:** Important assumptions appear near the bottom under `Necesita tu revisión`, after multiple long draft sections.
  - **Suggestion:** Show a prominent summary near the top, such as `2 decisiones necesitan revisión`, with links to each item. Require acknowledgement before saving when an assumption affects storage or food safety.
  - **Laws:** [Selective Attention](https://lawsofux.com/selective-attention/), [Von Restorff Effect](https://lawsofux.com/von-restorff-effect/)
  - **Why:** Critical uncertainty should be the most visually distinct part of the review, not something users discover after scanning the entire draft.

- [x] **Clarify the generated, ready, and completed states**
  - **Current issue:** `Tu preparación está lista` appears alongside 54 remaining steps. This can imply that the food is ready when only the preparation plan has been generated.
  - **Suggestion:** Use distinct state language:
    - `Tu plan de preparación está listo` after generation
    - `Sesión terminada` after a session
    - `Preparación semanal completada` when all sessions are complete
  - **Laws:** [Jakob's Law](https://lawsofux.com/jakobs-law/), [Mental Model](https://lawsofux.com/mental-model/)
  - **Why:** State labels should match the user's understanding of whether the plan, a session, or the actual food is ready.

- [x] **Use consistent, familiar Spanish terminology**
  - **Current issue:** Terms such as `batches`, `Slots`, and `air-fryer` appear in an otherwise Spanish interface.
  - **Suggestion:** Replace them with familiar labels:
    - `preparaciones`
    - `comidas seleccionadas`
    - `freidora de aire`
  - **Laws:** [Jakob's Law](https://lawsofux.com/jakobs-law/), [Cognitive Load](https://lawsofux.com/cognitive-load/)
  - **Why:** Consistent, familiar terminology reduces interpretation effort and makes the experience feel more trustworthy.

## P2

- [x] **Make Kitchen Mode more immersive**
  - **Current issue:** The Meal Prep tabs and global bottom navigation remain visible while following cooking instructions.
  - **Suggestion:** Hide unrelated navigation during Kitchen Mode, retain one clear exit, and show `Tu avance se guarda automáticamente` within the mode.
  - **Laws:** [Flow](https://lawsofux.com/flow/), [Selective Attention](https://lawsofux.com/selective-attention/)
  - **Why:** Cooking requires sustained attention and often involves wet or occupied hands. Competing navigation increases distraction and the possibility of accidental exits.

## Recommended implementation order

1. Add the completed-session screen.
2. Restructure the prepared-week overview around `next action` and `today`.
3. Generate a recommended plan before showing advanced configuration.
4. Simplify meal selection and add sticky progress actions.
5. Elevate assumptions that need review.
6. Clarify state labels and standardize terminology.
7. Make Kitchen Mode immersive.

## Existing strengths to preserve

- Kitchen Mode presents one instruction at a time.
- Primary cooking actions are large and easy to reach.
- Each task includes a timer and visible session progress.
- The three-step setup provides a useful overall structure.
- The product communicates that preparation does not change the user's nutrition plan.
