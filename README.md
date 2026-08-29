# Feedlo Navale - Bataille Navale

Jeu de bataille navale complet, jouable dans le navigateur. Construit avec **Vite + React + TypeScript**.

## Installation

Prerequis : [Node.js](https://nodejs.org/) 18 ou plus recent (installe `npm` automatiquement).

```bash
npm install
npm run dev
```

Le jeu s'ouvre automatiquement sur `http://localhost:5173`.

Pour generer une version statique de production (dossier `dist/`) :

```bash
npm run build
npm run preview
```

## Contenu du jeu

- **Menu principal** : Jouer, Arene, Statistiques, Parametres, Regles.
- **Jouer** :
  - **Contre un Bot** avec 4 niveaux de difficulte (Facile, Moyen, Difficile, Expert), chacun avec une vraie
    logique differente (tir aleatoire, chasse aux cases voisines, quadrillage, calcul de probabilites).
  - **A deux, meme appareil** : chaque joueur place sa flotte a tour de role, avec un ecran "passez
    l'appareil" entre chaque phase pour ne pas reveler les positions.
- **Arene** : une flotte, placee une seule fois, qui affronte des bots de plus en plus forts round
  apres round. La defaite met fin a la serie. Progression de rang (Recrue -> Legende des Mers) et
  meilleure serie sauvegardee.
- **Parametres** : taille de grille (8x8 / 10x10 / 12x12, la flotte s'adapte automatiquement), theme
  clair/sombre, son on/off, animations, regle "rejouer apres un tir reussi", regle "les navires ne se
  touchent pas".
- **Statistiques** : parties jouees, victoires/defaites, precision de tir, victoires par difficulte,
  meilleure serie de l'Arene. Le tout est sauvegarde dans le `localStorage` du navigateur (aucun compte,
  aucun serveur necessaire).
- **Regles** : page d'aide complete en francais.

## A propos des assets

Vous m'avez demande de recuperer des assets sur des sites externes. Je ne l'ai **pas** fait
volontairement : la plupart des images trouvees sur des sites tiers ont une licence incertaine, et les
redistribuer dans ce zip aurait pu poser un probleme de droits d'auteur. A la place, tout le visuel du
jeu est **fabrique maison et livre dans le zip** :

- Icones de navire, explosion, eclaboussure et illustration du menu : SVG originaux vectoriels
  (`src/assets/icons.tsx`, `src/assets/ShipSilhouette.tsx`), 100% libres de droits.
- Sons de tir, touche, coule, victoire, defaite : generes en direct par le navigateur avec la Web
  Audio API (`src/game/sound.ts`), aucun fichier audio a charger.

Resultat : le jeu fonctionne integralement hors-ligne des `npm install`, sans dependance a une image ou
un son externe qui pourrait un jour disparaitre ou etre mal licencie.

## Structure du projet

```
src/
  App.tsx                 Ecran principal, navigation entre les vues
  main.tsx                Point d'entree
  types/game.ts           Types partages (Board, Ship, Difficulty, ...)
  game/
    board.ts              Placement, tirs, victoire (moteur pur, sans React)
    ai.ts                 Intelligence artificielle des bots (4 niveaux)
    arena.ts               Progression de l'Arene (rangs, difficulte par round)
    fleet.ts               Composition de la flotte selon la taille de grille
    sound.ts               Effets sonores generes (Web Audio API)
  context/AppContext.tsx  Parametres + statistiques persistants (localStorage)
  components/             Tous les ecrans (Menu, Placement, Battle, Arene, ...)
  assets/                 Icones et illustration SVG originaux
  styles/global.css       Theme clair/sombre, grille, animations
```

## Si vous voulez ajouter vos propres assets

Le jeu est concu pour que ce soit simple :

1. **Remplacer les icones de navire / explosion / eclaboussure** : deposez vos fichiers `.svg` ou `.png`
   dans `src/assets/`, puis dans `src/assets/icons.tsx` remplacez le contenu SVG inline par
   `<img src="/src/assets/votre-fichier.svg" ... />` (ou importez le fichier et utilisez la variable
   resultante comme `src`).
2. **Ajouter une vraie musique de fond** : placez un fichier `.mp3`/`.ogg` dans `public/`, puis dans
   `src/App.tsx` ajoutez un `<audio src="/votre-musique.mp3" loop autoPlay={false} />` controle par un
   bouton, en respectant le reglage `settings.soundOn` du contexte.
3. **Changer les noms/tailles de la flotte** : editez `src/game/fleet.ts` (`FLEET` et `FLEET_SMALL`).
4. **Ajouter un mode "multijoueur en ligne"** : le moteur de jeu (`src/game/board.ts`) est deja separe
   de l'affichage, il peut etre reutilise cote serveur (ex: avec un serveur WebSocket) pour synchroniser
   deux navigateurs distants au lieu du mode "meme appareil" actuel.
5. **Ajouter d'autres langues** : les textes sont directement dans les composants `.tsx` (pas de fichier
   de traduction pour l'instant) ; le plus simple est de creer un dictionnaire `src/i18n.ts` puis de
   remplacer progressivement les chaines de caracteres.

## Notes techniques

- Aucune dependance backend : tout tourne cote navigateur.
- La sauvegarde (parametres + statistiques) est locale au navigateur (`localStorage`), donc propre a
  chaque appareil/navigateur utilise.
- Ce depot n'est pas encore un repository Git. Si vous voulez versionner le projet : `git init` puis un
  premier commit, avant de pousser vers GitHub/GitLab si besoin.
