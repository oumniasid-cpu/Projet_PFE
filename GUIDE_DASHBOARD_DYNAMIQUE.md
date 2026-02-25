# 🎯 Guide : Dashboard Dynamique avec Base de Données

## ✅ Ce qui a été modifié

Votre dashboard est maintenant **100% dynamique** et récupère les données depuis votre base de données MongoDB !

### Fichiers créés/modifiés :

```
📁 backend/
  📁 routes/
    📄 dashboard.js               ✅ NOUVEAU - API endpoint pour stats
  📄 server.js                    ✅ MODIFIÉ - Route dashboard ajoutée

📁 frontend/
  📁 src/
    📁 hooks/
      📄 useDashboardData.js      ✅ NOUVEAU - Hook pour récupérer les données
    📁 components/
      📄 GanttChart.jsx           ✅ MODIFIÉ - Utilise données dynamiques
      📄 BudgetChart.jsx          ✅ MODIFIÉ - Utilise données dynamiques
      📄 AlertsCard.jsx           ✅ MODIFIÉ - Utilise données dynamiques
    📁 pages/
      📄 Dashboard.jsx            ✅ MODIFIÉ - Intègre le hook
```

## 🔄 Comment ça fonctionne maintenant

### 1️⃣ **Backend : Endpoint Dashboard**

**`/api/dashboard/stats`** calcule et retourne :

```javascript
{
  stats: {
    overallProgress: 75,           // Progression moyenne de tous les projets
    budgetSpent: 250000,           // Total dépensé
    budgetPlanned: 500000,         // Total planifié
    nextMilestone: 5,              // Nombre de projets à venir
    milestoneDate: "2025-03-15",   // Prochaine échéance
    totalProjects: 12,             // Total de projets
    activeProjects: 8              // Projets actifs
  },
  projects: [                       // Projets pour Gantt Chart
    {
      id: "...",
      name: "Tour Résidentielle",
      status: "active",
      progress: 67,
      startDate: "2024-01-01",
      endDate: "2024-08-15",
      isDelayed: false,
      daysRemaining: 45
    },
    // ...
  ],
  alerts: [                         // Alertes intelligentes
    {
      type: "error",
      title: "Projets en retard",
      message: "3 projet(s) ont dépassé leur date limite..."
    },
    // ...
  ],
  budgetHistory: [                  // Historique pour graphique
    {
      month: "Jan 2025",
      budget: 50000,
      prediction: 55000,
      progress: "16.67%"
    },
    // ...
  ]
}
```

### 2️⃣ **Frontend : Hook personnalisé**

**`useDashboardData()`** :
- Récupère les données de l'API
- Actualise automatiquement toutes les 30 secondes
- Gère le loading et les erreurs
- Protège la route (redirige vers login si pas connecté)

### 3️⃣ **Composants Dynamiques**

Tous les composants reçoivent maintenant des **props** avec les vraies données :

```jsx
<ProgressCard progress={stats.overallProgress} />
<BudgetCard spent={stats.budgetSpent} planned={stats.budgetPlanned} />
<GanttChart projects={projects} />
<AlertsCard alerts={alerts} />
<BudgetChart budgetHistory={budgetHistory} />
```

## 🚀 Installation et Test

### Étape 1 : Copier les fichiers

```bash
# Depuis le dossier téléchargé
cd buildtrack-app

# Copier les nouveaux fichiers backend
cp backend/routes/dashboard.js VOTRE_PROJET/backend/routes/
cp backend/server.js VOTRE_PROJET/backend/

# Copier les fichiers frontend
cp -r frontend/src/hooks VOTRE_PROJET/frontend/src/
cp frontend/src/components/GanttChart.jsx VOTRE_PROJET/frontend/src/components/
cp frontend/src/components/BudgetChart.jsx VOTRE_PROJET/frontend/src/components/
cp frontend/src/components/AlertsCard.jsx VOTRE_PROJET/frontend/src/components/
cp frontend/src/pages/Dashboard.jsx VOTRE_PROJET/frontend/src/pages/
```

### Étape 2 : Redémarrer les serveurs

```bash
# Backend
cd backend
npm run dev

# Frontend (nouveau terminal)
cd frontend
npm run dev
```

### Étape 3 : Tester

1. **Connectez-vous** à votre compte
2. **Créez quelques projets** avec :
   - Budget (ex: 100000)
   - Dates de début et fin
   - Progression (ex: 50%)
   - Status (active, planning, etc.)

3. **Allez sur le Dashboard** : `/dashboard`

Vous devriez voir :
- ✅ Progression moyenne calculée
- ✅ Budget total affiché
- ✅ Projets dans le Gantt Chart
- ✅ Alertes intelligentes générées

## 📊 Alertes Intelligentes Automatiques

Le système génère automatiquement des alertes pour :

| Type | Condition | Message |
|------|-----------|---------|
| **Erreur** | Projet en retard | "X projet(s) ont dépassé leur date limite" |
| **Erreur** | Budget dépassé | "X projet(s) ont dépassé leur budget alloué" |
| **Warning** | Budget > 80% | "X projet(s) approchent de leur limite budgétaire" |
| **Warning** | Échéance < 7 jours | "X projet(s) arrivent à échéance dans les 7 prochains jours" |

## 🎨 Gantt Chart Dynamique

Le Gantt Chart affiche maintenant :

- ✅ **Tous vos projets actifs** depuis la DB
- ✅ **Barres positionnées** selon les vraies dates
- ✅ **Couleurs intelligentes** :
  - 🟢 Vert : Projet terminé (progress = 100%)
  - 🔵 Bleu : En cours (active, pas en retard)
  - 🔴 Rouge : En retard (date dépassée)
  - ⚫ Gris : Planifié
- ✅ **Indicateur "Aujourd'hui"** (ligne rouge)
- ✅ **Stats en temps réel** (terminés, en cours, en retard)

## 📈 Graphique Budget avec IA

Le graphique affiche :

- **Budget réel** : Dépenses actuelles par mois
- **Prédiction IA** : Projection basée sur :
  - Historique des dépenses
  - Tendance actuelle
  - +10% par mois (ajustable)

## 🔄 Actualisation Automatique

Le dashboard se **rafraîchit automatiquement** toutes les 30 secondes.

Pour changer l'intervalle, modifiez dans `useDashboardData.js` :

```javascript
// Actualiser toutes les 30 secondes
const interval = setInterval(fetchDashboardData, 30000);

// Changer à 1 minute (60000ms)
const interval = setInterval(fetchDashboardData, 60000);
```

## 🛠️ Personnalisation

### Modifier les alertes

**Dans `backend/routes/dashboard.js`**, section alertes :

```javascript
// Ajouter une nouvelle alerte
if (condition) {
  alerts.push({
    type: 'error',    // ou 'warning'
    title: 'Votre titre',
    message: 'Votre message'
  });
}
```

### Modifier le calcul de progression

```javascript
// Progression moyenne (actuel)
const overallProgress = totalProjects > 0
  ? Math.round(projects.reduce((sum, p) => sum + p.progress, 0) / totalProjects)
  : 0;

// Progression pondérée par budget
const overallProgress = totalBudget > 0
  ? Math.round(projects.reduce((sum, p) => 
      sum + (p.progress * p.budget.total), 0) / totalBudget)
  : 0;
```

### Changer l'algorithme de prédiction IA

**Dans `backend/routes/dashboard.js`**, fonction `generateBudgetHistory` :

```javascript
// Prédiction simple (+10% par mois)
const prediction = totalBudget * (1 + (0.1 * (6 - i)));

// Prédiction linéaire
const prediction = totalSpent + (totalSpent / (i + 1)) * (6 - i);

// Prédiction exponentielle
const prediction = totalBudget * Math.pow(1.15, (6 - i));
```

## 🐛 Dépannage

### Problème 1 : "Cannot read property 'stats' of undefined"

**Cause :** Le hook ne récupère pas les données

**Solution :**
```bash
# Vérifier que le backend tourne
curl http://localhost:5000/api/dashboard/stats

# Vérifier le token JWT
# Dans le navigateur : F12 > Application > Local Storage
# Doit contenir une clé "token"
```

### Problème 2 : Dashboard vide avec projets en DB

**Cause :** L'utilisateur n'est pas propriétaire des projets

**Solution :**
Créez des projets en étant connecté, ou modifiez la requête dans `dashboard.js` :

```javascript
// Voir TOUS les projets (pour test)
const projects = await Project.find({})
```

### Problème 3 : Erreur 401 Unauthorized

**Cause :** Token JWT invalide ou expiré

**Solution :**
```javascript
// Déconnectez-vous et reconnectez-vous
localStorage.clear();
window.location.href = '/login';
```

### Problème 4 : Gantt Chart ne s'affiche pas

**Cause :** Pas de projets actifs

**Solution :**
Créez des projets avec `status: 'active'` ou `status: 'planning'`

## 📱 Test avec Données de Démo

Pour tester rapidement, créez des projets via l'API :

```javascript
// Script de test (exécuter dans la console du navigateur)
const token = localStorage.getItem('token');

const testProjects = [
  {
    name: 'Tour Résidentielle',
    description: 'Construction tour 20 étages',
    budget: 2500000,
    startDate: '2024-01-01',
    endDate: '2024-08-15',
    status: 'active',
    progress: 67
  },
  {
    name: 'Centre Commercial',
    description: 'Rénovation centre commercial',
    budget: 1800000,
    startDate: '2024-02-01',
    endDate: '2024-06-30',
    status: 'active',
    progress: 89
  },
  {
    name: 'Parking Souterrain',
    description: 'Construction parking 3 niveaux',
    budget: 900000,
    startDate: '2024-03-01',
    endDate: '2024-12-31',
    status: 'active',
    progress: 25
  }
];

// Créer les projets
for (const project of testProjects) {
  await fetch('/api/projects', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(project)
  });
}

// Actualiser la page
window.location.reload();
```

## ✅ Checklist de Vérification

- [ ] Backend route `/api/dashboard/stats` créée
- [ ] Server.js mis à jour avec la route dashboard
- [ ] Hook `useDashboardData` créé
- [ ] Composants mis à jour (Gantt, Budget, Alerts)
- [ ] Dashboard.jsx utilise le hook
- [ ] Backend redémarré
- [ ] Frontend redémarré
- [ ] Connecté à un compte utilisateur
- [ ] Au moins 1 projet créé
- [ ] Dashboard affiche les vraies données
- [ ] Gantt Chart montre les projets
- [ ] Alertes s'affichent
- [ ] Graphique budget fonctionnel

## 🎉 Résultat Final

Votre dashboard affiche maintenant :

✅ **Données en temps réel** depuis MongoDB  
✅ **Alertes intelligentes** générées automatiquement  
✅ **Gantt Chart dynamique** avec tous vos projets  
✅ **Graphique budget** avec prédictions IA  
✅ **Actualisation automatique** toutes les 30s  
✅ **Gestion des erreurs** et états de chargement  

**Félicitations ! Votre dashboard est maintenant entièrement dynamique ! 🚀**