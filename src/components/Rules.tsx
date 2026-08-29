import React from "react";

interface RulesProps {
  onBack: () => void;
  backLabel?: string;
}

export function Rules({ onBack, backLabel = "Retour au menu" }: RulesProps) {
  return (
    <div className="panel stack">
      <h2>Regles du jeu</h2>

      <div className="stack">
        <div>
          <h3>1. Placement de la flotte</h3>
          <p className="subtitle">
            Chaque joueur place secretement ses navires sur sa grille : Porte-avions, Croiseur,
            Contre-torpilleur, Sous-marin et Torpilleur. Un navire occupe une ligne de cases,
            horizontale ou verticale. Cliquez sur un navire de la liste pour le selectionner,
            pivotez-le si besoin, puis cliquez sur la grille pour le poser. Le bouton "Placement
            aleatoire" place le reste de la flotte pour vous.
          </p>
        </div>

        <div>
          <h3>2. Deroulement d'un tour</h3>
          <p className="subtitle">
            Les joueurs tirent a tour de role sur la grille de l'adversaire en cliquant une case.
            Un tir peut etre : dans l'eau (manque), au but (touche un navire), ou coule (le
            dernier segment d'un navire est touche). Si l'option "Rejouer apres un tir reussi"
            est activee dans les Parametres, un coup au but donne un tir supplementaire immediat.
          </p>
        </div>

        <div>
          <h3>3. Victoire</h3>
          <p className="subtitle">
            La partie se termine des que tous les navires d'un joueur sont coules. L'autre joueur
            remporte la bataille.
          </p>
        </div>

        <div>
          <h3>4. Modes de jeu</h3>
          <p className="subtitle">
            <strong>Contre un Bot</strong> : affrontez une intelligence artificielle avec 4 niveaux
            de difficulte, du tir aleatoire a l'analyse de probabilites. <strong>A deux</strong> :
            jouez a tour de role sur le meme appareil, avec un ecran de transition entre chaque
            joueur pour ne pas reveler les positions. <strong>Arene</strong> : enchainez les
            combats contre des bots de plus en plus difficiles sans perdre, pour grimper les rangs
            et battre votre meilleure serie.
          </p>
        </div>

        <div>
          <h3>5. Options</h3>
          <p className="subtitle">
            Dans les Parametres, vous pouvez changer la taille de grille (8x8, 10x10 ou 12x12),
            activer la regle "les navires ne se touchent pas", couper le son ou choisir un theme
            clair.
          </p>
        </div>
      </div>

      <button className="btn btn-ghost" onClick={onBack}>
        {backLabel}
      </button>
    </div>
  );
}
