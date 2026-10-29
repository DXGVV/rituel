# Rituel · Tom

Appli perso (PWA) pour suivre ma routine skincare et dents sur iPhone.

- **Jour** : la routine du matin et du soir dans l'ordre, dents puis peau, avec une note par étape. On coche au fur et à mesure.
- Chaque produit affiché avec son rôle en un ou deux mots (anti-taches, points noirs, anti-rides…), étapes optionnelles qui ne comptent pas dans la progression
- **Calendrier** : le mois en un coup d'œil (matin fait, soir fait, photo prise) et la série de jours complets
- **Photos** : une photo de peau par jour, mode avant / après pour comparer deux dates
- **Produits** : rôle, jours matin et soir réglables pour chaque produit, ajout d'une liste en collant un produit par ligne

## Mise en ligne (GitHub Pages)

1. Créer un dépôt public (ex. `rituel`) et y déposer tous les fichiers à la racine.
2. Settings > Pages > Source : `Deploy from a branch`, branche `main`, dossier `/ (root)`.
3. Attendre 1 à 2 minutes, l'appli est sur `https://<pseudo>.github.io/rituel/`.

## Installation sur l'iPhone

1. Ouvrir l'adresse dans Safari.
2. Bouton Partager > « Sur l'écran d'accueil ».
3. Lancer l'appli depuis l'icône (plein écran, marche hors ligne).

## Données

- Tout est stocké en local sur le téléphone (localStorage, photos dans IndexedDB), rien n'est envoyé ailleurs.
- Produits > Sauvegarde > Exporter : fichier JSON (photos comprises) à garder dans Fichiers / iCloud.

## Mettre à jour l'appli

Remplacer les fichiers sur GitHub, puis changer `VERSION` dans `sw.js` (ex. `rituel-v1.0.1`) pour forcer le téléphone à recharger la nouvelle version.
