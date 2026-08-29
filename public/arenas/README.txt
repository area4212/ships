Bannières des arènes
====================

Une image par arène, affichée en bannière sur sa carte dans l'écran "Arènes".
Les 6 bannières sont déjà en place (converties du zip "bannieres_arenes_feedlo",
PNG ~330 Ko -> JPG ~45 Ko chacune).

Fichiers (noms exacts, référencés par src/components/ArenaIntro.tsx) :

  classique.jpg   -> Arène Classique
  archipel.jpg    -> Archipel
  blitz.jpg       -> Blitz
  brume.jpg       -> Brume de Guerre
  tempete.jpg     -> Tempête
  extreme.jpg     -> Arène Extrême

Pour remplacer une bannière : écrasez le .jpg correspondant (format paysage,
~800 x 275 px, garder < 150 Ko). Si un fichier est supprimé, la carte
retombe automatiquement sur son décor dessiné en CSS, sans erreur.
Un léger voile sombre est appliqué par-dessus pour la lisibilité du texte.
