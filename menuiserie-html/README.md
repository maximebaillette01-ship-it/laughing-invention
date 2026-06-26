# Atelier Menuiserie — site de gestion (HTML statique)

Application de gestion pour une entreprise de menuiserie : clients, stock de
matériaux, chantiers, devis et factures. Entièrement en HTML/CSS/JavaScript,
**sans serveur ni base de données** : toutes les données sont stockées dans
le navigateur (`localStorage`).

## Utilisation

Ouvrez simplement `index.html` dans un navigateur (double-clic, ou
clic droit → Ouvrir avec). Aucune installation, aucune connexion internet
requise.

Pour le déployer en ligne, il suffit d'héberger ce dossier tel quel sur
n'importe quel hébergement statique (GitHub Pages, Netlify, un simple FTP,
etc.) : ce sont uniquement des fichiers HTML/CSS/JS.

Des données de démonstration sont chargées automatiquement au premier
lancement (clients, chantiers, devis, factures, matériaux), pour voir
immédiatement à quoi ressemble l'application.

## Fonctionnalités

- **Clients** : carnet d'adresses, fiche détaillée avec l'historique des
  chantiers, devis et factures liés.
- **Matériaux / stock** : suivi des quantités et d'un seuil d'alerte, avec
  signalement sur le tableau de bord et la liste dès que le stock est bas.
- **Chantiers** : suivi par statut (en attente, en cours, terminé, annulé),
  rattachés à un client.
- **Devis** : lignes dynamiques (description, quantité, unité, prix),
  calcul automatique du total HT / TVA / TTC, cycle de statut (brouillon →
  envoyé → accepté/refusé), conversion en facture en un clic une fois
  accepté, vue imprimable.
- **Factures** : générées librement ou depuis un devis accepté, statut
  payée/impayée, détection automatique des factures en retard, vue
  imprimable.
- **Tableau de bord** : compteurs clés et listes des éléments à traiter
  (chantiers en cours, devis en attente, factures à relancer, alertes
  stock).
- **Paramètres** : export/import des données au format JSON (sauvegarde),
  réinitialisation avec les données de démonstration, suppression complète.

## Limites à connaître

Les données sont propres à **ce navigateur, sur cet appareil** : elles ne
sont pas partagées entre plusieurs postes et disparaissent si vous videz le
cache du navigateur. Pensez à utiliser **Paramètres → Exporter les données**
régulièrement pour garder une sauvegarde, et **Importer** pour la restaurer
(ou la transférer sur un autre appareil).

## Structure

```
index.html       page unique (coquille de l'application)
css/style.css     styles (thème menuiserie, responsive, impression)
js/data.js        stockage localStorage, données de démonstration, calculs
js/app.js         routage (par hash), rendu des vues, interactions
```
