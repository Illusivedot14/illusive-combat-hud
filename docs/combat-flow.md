# Combat flow

D&D Beyond is the sheet. Foundry is the fight.

Out of combat has no clock. In combat plays like Baldur’s Gate 3: a pool on your turn until you end it.

Code map: [combat-flow-technical.md](combat-flow-technical.md).

stateDiagram-v2
    [*] --> OutOfCombat: copy Beyond into Foundry

    state OutOfCombat {
        [*] --> Table
        Table: No rounds, no feet budget
        Table: Map, party rail, token panel
        Table: Next on the tracker says Begin
        Table --> CastOoc: use an ability
        CastOoc --> Table: it happens, no A/B spent
        Table --> Table: walk anywhere
        Table --> Table: refresh from Beyond
    }

    OutOfCombat --> Starting: Begin or join
    Starting: Roll initiative
    Starting: Tracker comes alive
    Starting: Feet and A/B/R turn on
    Starting --> InCombat: first turn

    state InCombat {
        [*] --> Waiting

        Waiting: Not your turn
        Waiting: Watch the tracker
        Waiting --> React: something triggers a reaction
        React --> Waiting: use it or pass
        Waiting --> YourTurn: it becomes your turn

        state YourTurn {
            [*] --> Pool
            Pool: Movement, Action, Bonus are a pool
            Pool --> Pool: move or undo last step
            Pool --> Pool: Action — attack, spell, Dash, Hide
            Pool --> Pool: Extra Attack — still your turn
            Pool --> Pool: Bonus — if you have one
            Pool --> Pool: one target fires, several you pick first
        }

        YourTurn --> Waiting: End Turn — next person, map may pan
    }

    InCombat --> InCombat: something resolves — hit or miss, damage, conditions
    InCombat --> InCombat: instant area goes away, concentration area stays
    InCombat --> OutOfCombat: End combat or leave — no clock, idle movement, economy off
