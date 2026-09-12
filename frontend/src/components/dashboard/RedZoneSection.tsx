import { Habitation, fetchRedZoneHabitations, fetchRelocationAssessmentsByHabitation } from '../../services/api';
import { useEffect, useState } from 'react';
import { RiskBadge } from '../Icons';

interface RedZoneSectionProps {
  loading?: boolean;
}

interface RelocationAssessmentData {
  recommendation: string;
  priority_level: string;
  relocation_site_id: string;
}

function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-surface-200 rounded ${className}`} />
  );
}

function RedZoneRow({ habitation, assessment }: { habitation: Habitation; assessment: RelocationAssessmentData | null }) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'P1': return 'bg-red-50 text-red-700';
      case 'P2': return 'bg-orange-50 text-orange-700';
      case 'P3': return 'bg-amber-50 text-amber-700';
      case 'P4': return 'bg-blue-50 text-blue-700';
      default: return 'bg-surface-100 text-surface-700';
    }
  };

  return (
    <div className="flex items-start gap-4 p-4 bg-surface-50 rounded-lg hover:bg-surface-100 transition-colors">
      <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold text-surface-900 truncate">{habitation.name}</p>
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getPriorityColor(assessment?.priority_level || 'P1')}`}>
            {assessment?.priority_level || 'P1'}
          </span>
        </div>
        <p className="text-sm text-surface-500">{habitation.district}, {habitation.state}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <RiskBadge level={habitation.risk_level} />
          <span className="text-xs text-surface-500 px-2 py-0.5 bg-surface-100 rounded">{habitation.hazard_type}</span>
          <span className="text-xs text-surface-500">Pop: {habitation.population.toLocaleString()}</span>
          <span className="text-xs font-medium text-red-600">Risk: {habitation.risk_score}</span>
        </div>
        {assessment && (
          <div className="mt-2 p-3 bg-primary-50 rounded-lg border border-primary-100">
            <p className="text-xs font-medium text-primary-700">Recommended Action:</p>
            <p className="text-sm text-primary-900 mt-1">{assessment.recommendation}</p>
            <p className="text-xs text-primary-600 mt-1">Site: {assessment.relocation_site_id}</p>
          </div>
        )}
      </div>
      <div className="text-right">
        <span className="px-2 py-1 text-xs font-medium bg-red-50 text-red-700 rounded-full">
          Immediate Action
        </span>
      </div>
    </div>
  );
}

export function RedZoneSection({ loading = false }: RedZoneSectionProps) {
  const [habitations, setHabitations] = useState<Habitation[]>([]);
  const [assessments, setAssessments] = useState<Map<string, RelocationAssessmentData>>(new Map());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadRedZones() {
      try {
        const data = await fetchRedZoneHabitations(10);
        setHabitations(data.habitations);
      } catch (err) {
        console.error('Failed to load red zones:', err);
        setError('Unable to load red zone habitations');
      }
    }
    loadRedZones();
  }, []);

  useEffect(() => {
    if (habitations.length === 0) return;
    
    async function loadAssessments() {
      const assessmentMap = new Map<string, RelocationAssessmentData>();
      
      try {
        await Promise.all(
          habitations.map(async (habitation) => {
            try {
              const data = await fetchRelocationAssessmentsByHabitation(habitation.id);
              if (data.relocation_assessments.length > 0) {
                const latest = data.relocation_assessments[0];
                assessmentMap.set(habitation.id, {
                  recommendation: latest.recommendation,
                  priority_level: latest.priority_level,
                  relocation_site_id: latest.relocation_site_id,
                });
              }
            } catch (err) {
              console.error(`Failed to load assessment for ${habitation.id}:`, err);
            }
          })
        );
      } finally {
        setAssessments(assessmentMap);
      }
    }
    loadAssessments();
  }, [habitations]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-surface-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-start gap-4 p-4 bg-surface-50 rounded-lg">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-60" />
                <Skeleton className="h-3 w-80" />
                <Skeleton className="h-16 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-surface-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-surface-900">Priority Red Zones</h2>
          <p className="text-xs text-surface-500">Critical Risk Habitations</p>
        </div>
        <div className="text-center py-8 text-surface-500">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (habitations.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-surface-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-surface-900">Priority Red Zones</h2>
          <p className="text-xs text-surface-500">Critical Risk Habitations</p>
        </div>
        <div className="text-center py-8 text-surface-500">
          <svg className="w-12 h-12 mx-auto text-green-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="font-medium text-surface-700">No critical risk habitations</p>
          <p className="text-sm mt-1">All habitations are below critical risk threshold</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-surface-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-surface-900">Priority Red Zones</h2>
        <p className="text-xs text-surface-500">{habitations.length} critical risk habitations</p>
      </div>
      <div className="space-y-3">
        {habitations.map((habitation) => (
          <RedZoneRow 
            key={habitation.id} 
            habitation={habitation} 
            assessment={assessments.get(habitation.id) || null} 
          />
        ))}
      </div>
      {habitations.length >= 10 && (
        <div className="mt-4 text-center">
          <span className="text-sm text-primary-600 hover:text-primary-700 font-medium">
            View all red zones →
          </span>
        </div>
      )}
    </div>
  );
}