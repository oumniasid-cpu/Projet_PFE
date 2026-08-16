import React, { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance';

const formatDA = (num) =>
    num === null || num === undefined
        ? '—'
        : num.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' DA';

function Metric({ label, value, sub }) {
    return (
        <div>
            <p className="text-sm text-gray-500">{label}</p>
            <p className="text-lg font-semibold">{value}</p>
            {sub && <p className="text-xs text-gray-400">{sub}</p>}
        </div>
    );
}

export default function EVMCard({ projectId }) {
    const [evm, setEvm] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let isMounted = true;
        const fetchEVM = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await axiosInstance.get(`/evm/${projectId}`);
                if (isMounted) setEvm(res.data);
            } catch (err) {
                if (isMounted) {
                    setError(err.response?.data?.error || 'Erreur de chargement des indicateurs EVM');
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        fetchEVM();
        return () => { isMounted = false; };
    }, [projectId]);

    if (loading) {
        return <div className="bg-white rounded-lg shadow p-6">Chargement des indicateurs EVM...</div>;
    }
    if (error) {
        return <div className="bg-white rounded-lg shadow p-6 text-red-500 text-sm">{error}</div>;
    }
    if (!evm) return null;

    const { indicators, delayEstimateDays, analysisDate } = evm;
    const { BAC, VP, VA, CR, EC, ED, IPC, IPD, EAC, ETC, VAC, TCPI } = indicators;

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Analyse de la Valeur Acquise (EVM)</h3>
                <span className="text-xs text-gray-400">Analyse au {analysisDate}</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Metric label="BAC (Budget total)" value={formatDA(BAC)} />
                <Metric label="VP (Valeur Planifiée)" value={formatDA(VP)} />
                <Metric label="VA (Valeur Acquise)" value={formatDA(VA)} />
                <Metric label="CR (Coût Réel)" value={formatDA(CR)} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className={`p-4 rounded-lg ${EC >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                    <p className="text-sm text-gray-500">Écart de coût (EC)</p>
                    <p className={`text-2xl font-bold ${EC >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatDA(EC)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                        {EC >= 0 ? 'Économie de coût — situation favorable' : 'Dépassement de coût — situation défavorable'}
                    </p>
                </div>
                <div className={`p-4 rounded-lg ${ED >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                    <p className="text-sm text-gray-500">Écart de délai (ED)</p>
                    <p className={`text-2xl font-bold ${ED >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatDA(ED)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                        {ED >= 0 ? 'En avance sur le planning' : 'En retard sur le planning'}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <Metric
                    label="IPC (Indice Performance Coût)"
                    value={IPC !== null ? IPC.toFixed(3) : '—'}
                    sub={IPC !== null ? (IPC >= 1 ? 'Performant' : 'Dérive budgétaire') : ''}
                />
                <Metric
                    label="IPD (Indice Performance Délai)"
                    value={IPD !== null ? IPD.toFixed(3) : '—'}
                    sub={IPD !== null ? (IPD >= 1 ? 'En avance' : 'En retard') : ''}
                />
            </div>

            <div className="border-t pt-4">
                <h4 className="font-medium mb-3 text-sm text-gray-600">Prévisions à terminaison</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Metric label="EAC (Coût final estimé)" value={formatDA(EAC)} />
                    <Metric label="ETC (Reste à engager)" value={formatDA(ETC)} />
                    <Metric label="VAC (Écart à terminaison)" value={formatDA(VAC)} />
                    <Metric label="TCPI" value={TCPI !== null ? TCPI.toFixed(3) : '—'} />
                </div>
            </div>

            {delayEstimateDays !== null && (
                <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                    <p className="text-sm">
                        Retard estimé : <strong>{delayEstimateDays} jours</strong> par rapport à la date contractuelle
                    </p>
                </div>
            )}
        </div>
    );
}