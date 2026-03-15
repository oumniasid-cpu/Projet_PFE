// Dans votre composant DailyReports
const [projects, setProjects] = useState([]);
const [selectedProject, setSelectedProject] = useState('');

// Charger les projets depuis le backend au démarrage
useEffect(() => {
  const fetchProjects = async () => {
    const response = await fetch('/api/reports/projects-list');
    const data = await response.json();
    setProjects(data);
  };
  fetchProjects();
}, []);

// Dans le JSX du formulaire :
// Exemple de sélection dans votre JSX
<select 
  required
  value={formData.project_id}
  onChange={(e) => setFormData({...formData, project_id: e.target.value})}
  className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
>
  <option value="">-- Sélectionnez un projet actif --</option>
  {projects.map(proj => (
    <option key={proj.id} value={proj.id}>{proj.name}</option>
  ))}
</select>