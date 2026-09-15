import json
import os
from pathlib import Path
from typing import Optional, List, Dict, Any
from datetime import datetime

SAMPLE_DATA_DIR = Path(__file__).parent.parent.parent.parent / "data" / "sample"


def load_json(filename: str) -> List[Dict[Any, Any]]:
    filepath = SAMPLE_DATA_DIR / filename
    if filepath.exists():
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []


def create_habitation_geometry(lat: float, lon: float) -> Dict:
    """Create GeoJSON Point geometry for habitation."""
    return {
        "type": "Point",
        "coordinates": [lon, lat]
    }


def create_relocation_site_geometry(lat: float, lon: float) -> Dict:
    """Create GeoJSON Point geometry for relocation site."""
    return {
        "type": "Point",
        "coordinates": [lon, lat]
    }


def get_hazard_geometry(hazard_id: str) -> Optional[Dict]:
    """Get GeoJSON MultiPolygon geometry for hazard from hazards.geojson."""
    data = load_json("hazards.geojson")
    for feature in data.get("features", []):
        props = feature.get("properties", {})
        if props.get("id") == hazard_id:
            return feature.get("geometry")
    return None


class FallbackDataService:
    def __init__(self):
        self._habitations = None
        self._hazards = None
        self._infrastructure = None
        self._risk_assessments = None
        self._relocation_sites = None
        self._capacity_assessments = None
        self._relocation_assessments = None
        self._alerts = None

    @property
    def habitations(self) -> List[Dict]:
        if self._habitations is None:
            self._habitations = load_json("habitations.json")
        return self._habitations

    @property
    def hazards(self) -> List[Dict]:
        if self._hazards is None:
            data = load_json("hazards.geojson")
            self._hazards = data.get("features", [])
        return self._hazards

    @property
    def infrastructure(self) -> List[Dict]:
        if self._infrastructure is None:
            self._infrastructure = load_json("infrastructure.json")
        return self._infrastructure

    @property
    def risk_assessments(self) -> List[Dict]:
        if self._risk_assessments is None:
            self._risk_assessments = load_json("risk_assessments.json")
        return self._risk_assessments

    @property
    def relocation_sites(self) -> List[Dict]:
        if self._relocation_sites is None:
            self._relocation_sites = load_json("relocation_sites.json")
        return self._relocation_sites

    @property
    def capacity_assessments(self) -> List[Dict]:
        if self._capacity_assessments is None:
            self._capacity_assessments = load_json("capacity_assessments.json")
        return self._capacity_assessments

    @property
    def relocation_assessments(self) -> List[Dict]:
        if self._relocation_assessments is None:
            self._relocation_assessments = load_json("relocation_assessments.json")
        return self._relocation_assessments

    @property
    def alerts(self) -> List[Dict]:
        if self._alerts is None:
            self._alerts = load_json("alerts.json")
        return self._alerts

    def _add_habitation_geometry(self, habitation: Dict) -> Dict:
        """Add GeoJSON geometry to habitation data."""
        result = habitation.copy()
        result["geometry"] = create_habitation_geometry(
            habitation["latitude"], habitation["longitude"]
        )
        return result

    def _add_relocation_site_geometry(self, site: Dict) -> Dict:
        """Add GeoJSON geometry to relocation site data."""
        result = site.copy()
        result["geometry"] = create_relocation_site_geometry(
            site["latitude"], site["longitude"]
        )
        return result

    def _add_hazard_geometry(self, hazard: Dict) -> Dict:
        """Add GeoJSON geometry to hazard data."""
        props = hazard.get("properties", {})
        result = props.copy()
        result["geometry"] = hazard.get("geometry")
        return result

    def get_habitations(self, risk_level: Optional[str] = None, hazard_type: Optional[str] = None,
                        relocation_priority: Optional[str] = None, district: Optional[str] = None,
                        limit: int = 100, offset: int = 0) -> Dict:
        data = self.habitations
        if risk_level:
            data = [h for h in data if h.get("risk_level") == risk_level]
        if hazard_type:
            data = [h for h in data if h.get("hazard_type") == hazard_type]
        if relocation_priority:
            data = [h for h in data if h.get("relocation_priority") == relocation_priority]
        if district:
            data = [h for h in data if district.lower() in h.get("district", "").lower()]

        total = len(data)
        result_data = [self._add_habitation_geometry(h) for h in data[offset:offset+limit]]
        return {"habitations": result_data, "total": total}

    def get_habitation(self, habitation_id: str) -> Optional[Dict]:
        for h in self.habitations:
            if h["id"] == habitation_id:
                return self._add_habitation_geometry(h)
        return None

    def get_habitation_stats(self) -> Dict:
        total = len(self.habitations)
        by_risk = {}
        for level in ["LOW", "MODERATE", "ELEVATED", "HIGH", "CRITICAL"]:
            by_risk[level] = sum(1 for h in self.habitations if h.get("risk_level") == level)

        by_hazard = {}
        for hazard in ["Landslide", "Flood", "Cloudburst", "Coastal Erosion"]:
            by_hazard[hazard] = sum(1 for h in self.habitations if h.get("hazard_type") == hazard)

        total_population = sum(h.get("population", 0) for h in self.habitations)
        high_risk = by_risk.get("HIGH", 0)
        critical_risk = by_risk.get("CRITICAL", 0)

        return {
            "total_habitations": total,
            "habitations_by_risk": by_risk,
            "habitations_by_hazard": by_hazard,
            "total_population": total_population,
            "high_risk_count": high_risk,
            "critical_risk_count": critical_risk,
        }

    def get_hazards(self, hazard_type: Optional[str] = None, limit: int = 100, offset: int = 0) -> Dict:
        data = self.hazards
        if hazard_type:
            data = [h for h in data if h.get("properties", {}).get("hazard_type") == hazard_type]

        hazards = [self._add_hazard_geometry(h) for h in data]
        total = len(hazards)
        return {"hazards": hazards[offset:offset+limit], "total": total}

    def get_hazard(self, hazard_id: str) -> Optional[Dict]:
        for h in self.hazards:
            props = h.get("properties", {})
            if props.get("id") == hazard_id:
                return self._add_hazard_geometry(h)
        return None

    def get_infrastructure(self, habitation_id: Optional[str] = None, limit: int = 100, offset: int = 0) -> Dict:
        data = self.infrastructure
        if habitation_id:
            data = [i for i in data if i.get("habitation_id") == habitation_id]

        total = len(data)
        return {"infrastructure": data[offset:offset+limit], "total": total}

    def get_infrastructure_by_habitation(self, habitation_id: str) -> Optional[Dict]:
        for i in self.infrastructure:
            if i["habitation_id"] == habitation_id:
                return i
        return None

    def get_risk_assessments(self, risk_level: Optional[str] = None, habitation_id: Optional[str] = None,
                              limit: int = 100, offset: int = 0) -> Dict:
        data = self.risk_assessments
        if risk_level:
            data = [r for r in data if r.get("risk_level") == risk_level]
        if habitation_id:
            data = [r for r in data if r.get("habitation_id") == habitation_id]

        total = len(data)
        return {"risk_assessments": data[offset:offset+limit], "total": total}

    def get_risk_assessment(self, assessment_id: int) -> Optional[Dict]:
        for r in self.risk_assessments:
            if r.get("id") == assessment_id:
                return r
        return None

    def get_risk_assessment_by_habitation(self, habitation_id: str) -> Optional[Dict]:
        for r in self.risk_assessments:
            if r["habitation_id"] == habitation_id:
                return r
        return None

    def get_relocation_sites(self, capacity_status: Optional[str] = None, limit: int = 100, offset: int = 0) -> Dict:
        data = self.relocation_sites
        if capacity_status:
            if capacity_status == "SUFFICIENT":
                data = [s for s in data if s.get("available_capacity", 0) > 1000]
            elif capacity_status == "LIMITED":
                data = [s for s in data if 100 <= s.get("available_capacity", 0) <= 1000]
            elif capacity_status == "INSUFFICIENT":
                data = [s for s in data if s.get("available_capacity", 0) < 100]

        total = len(data)
        result_data = [self._add_relocation_site_geometry(s) for s in data[offset:offset+limit]]
        return {"relocation_sites": result_data, "total": total}

    def get_relocation_site(self, site_id: str) -> Optional[Dict]:
        for s in self.relocation_sites:
            if s["id"] == site_id:
                return self._add_relocation_site_geometry(s)
        return None

    def get_relocation_sites_stats(self) -> Dict:
        total = len(self.relocation_sites)
        total_capacity = sum(s.get("total_capacity", 0) for s in self.relocation_sites)
        available_capacity = sum(s.get("available_capacity", 0) for s in self.relocation_sites)
        return {
            "total_sites": total,
            "total_capacity": total_capacity,
            "available_capacity": available_capacity,
        }

    def get_capacity_assessments(self, capacity_status: Optional[str] = None,
                                  relocation_site_id: Optional[str] = None,
                                  limit: int = 100, offset: int = 0) -> Dict:
        data = self.capacity_assessments
        if capacity_status:
            data = [c for c in data if c.get("capacity_status") == capacity_status]
        if relocation_site_id:
            data = [c for c in data if c.get("relocation_site_id") == relocation_site_id]

        total = len(data)
        return {"capacity_assessments": data[offset:offset+limit], "total": total}

    def get_capacity_assessment(self, assessment_id: int) -> Optional[Dict]:
        for c in self.capacity_assessments:
            if c.get("id") == assessment_id:
                return c
        return None

    def get_capacity_assessment_by_site(self, site_id: str) -> Optional[Dict]:
        for c in self.capacity_assessments:
            if c["relocation_site_id"] == site_id:
                return c
        return None

    def get_relocation_assessments(self, priority_level: Optional[str] = None,
                                    habitation_id: Optional[str] = None,
                                    relocation_site_id: Optional[str] = None,
                                    limit: int = 100, offset: int = 0) -> Dict:
        data = self.relocation_assessments
        if priority_level:
            data = [r for r in data if r.get("priority_level") == priority_level]
        if habitation_id:
            data = [r for r in data if r.get("habitation_id") == habitation_id]
        if relocation_site_id:
            data = [r for r in data if r.get("relocation_site_id") == relocation_site_id]

        total = len(data)
        return {"relocation_assessments": data[offset:offset+limit], "total": total}

    def get_relocation_assessment(self, assessment_id: int) -> Optional[Dict]:
        for r in self.relocation_assessments:
            if r.get("id") == assessment_id:
                return r
        return None

    def get_relocation_assessments_by_habitation(self, habitation_id: str) -> List[Dict]:
        return [r for r in self.relocation_assessments if r["habitation_id"] == habitation_id]

    def get_priority_statistics(self) -> Dict:
        """Get relocation priority statistics computed from current data."""
        from app.algorithms import assess_all_priorities, get_priority_statistics
        
        habitations = self.habitations
        infrastructure = self.infrastructure
        results = assess_all_priorities(habitations, infrastructure)
        return get_priority_statistics(results)

    def get_all_recommendations(self) -> List[Dict]:
        """Get all relocation recommendations for all habitations."""
        from app.algorithms import get_all_recommendations
        
        habitations = self.habitations
        sites = self.relocation_sites
        cap_dict = {}
        for c in self.capacity_assessments:
            cap_dict[c["relocation_site_id"]] = c
        
        all_recommendations = []
        for hab in habitations:
            result = get_all_recommendations(hab, sites, cap_dict)
            all_recommendations.append(result)
        return all_recommendations

    def get_recommendations_for_habitation(self, habitation_id: str) -> Optional[Dict]:
        """Get relocation recommendations for a specific habitation."""
        from app.algorithms import get_all_recommendations
        
        hab = self.get_habitation(habitation_id)
        if not hab:
            return None
        
        sites = self.relocation_sites
        cap_dict = {}
        for c in self.capacity_assessments:
            cap_dict[c["relocation_site_id"]] = c
        
        return get_all_recommendations(hab, sites, cap_dict)

    def get_alerts(self, level: Optional[str] = None, habitation_id: Optional[str] = None,
                    relocation_site_id: Optional[str] = None, is_read: Optional[bool] = None,
                    status: Optional[str] = None, alert_type: Optional[str] = None,
                    limit: int = 100, offset: int = 0) -> Dict:
        data = self.alerts
        if level:
            data = [a for a in data if a.get("level") == level]
        if habitation_id:
            data = [a for a in data if a.get("habitation_id") == habitation_id]
        if relocation_site_id:
            data = [a for a in data if a.get("relocation_site_id") == relocation_site_id]
        if is_read is not None:
            data = [a for a in data if a.get("is_read", 0) == (1 if is_read else 0)]
        if status:
            data = [a for a in data if a.get("status", "ACTIVE") == status]
        if alert_type:
            data = [a for a in data if a.get("alert_type", "SYSTEM_INFO") == alert_type]

        data = sorted(data, key=lambda x: x.get("created_at", ""), reverse=True)
        total = len(data)
        return {"alerts": data[offset:offset+limit], "total": total}

    def get_alert(self, alert_id: int) -> Optional[Dict]:
        for a in self.alerts:
            if a.get("id") == alert_id:
                return a
        return None

    def get_alerts_stats(self) -> Dict:
        total = len(self.alerts)
        return {
            "total_alerts": total,
            "critical": sum(1 for a in self.alerts if a.get("level") == "CRITICAL"),
            "high": sum(1 for a in self.alerts if a.get("level") == "HIGH"),
            "warning": sum(1 for a in self.alerts if a.get("level") == "WARNING"),
            "info": sum(1 for a in self.alerts if a.get("level") == "INFO"),
            "unread": sum(1 for a in self.alerts if a.get("is_read", 0) == 0),
        }

    def get_alert_statistics(self) -> Dict:
        """Get detailed alert statistics."""
        alerts = self.alerts
        by_level = {"CRITICAL": 0, "HIGH": 0, "WARNING": 0, "INFO": 0}
        by_status = {"ACTIVE": 0, "ACKNOWLEDGED": 0, "RESOLVED": 0}
        by_type = {}
        for a in alerts:
            by_level[a.get("level", "INFO")] = by_level.get(a.get("level", "INFO"), 0) + 1
            by_status[a.get("status", "ACTIVE")] = by_status.get(a.get("status", "ACTIVE"), 0) + 1
            at = a.get("alert_type", "SYSTEM_INFO")
            by_type[at] = by_type.get(at, 0) + 1
        unread = sum(1 for a in alerts if a.get("is_read", 0) == 0)
        return {
            "total_alerts": len(alerts),
            "by_level": by_level,
            "by_status": by_status,
            "by_type": by_type,
            "unread": unread,
            "recent_7_days": len(alerts),
        }

    def acknowledge_alert(self, alert_id: int, username: str) -> Optional[Dict]:
        for a in self.alerts:
            if a.get("id") == alert_id:
                if a.get("status") == "RESOLVED":
                    return None
                a["status"] = "ACKNOWLEDGED"
                a["acknowledged_at"] = datetime.utcnow().isoformat() + "Z"
                a["acknowledged_by"] = username
                a["updated_at"] = datetime.utcnow().isoformat() + "Z"
                return a
        return None

    def resolve_alert(self, alert_id: int, username: str) -> Optional[Dict]:
        for a in self.alerts:
            if a.get("id") == alert_id:
                a["status"] = "RESOLVED"
                a["resolved_at"] = datetime.utcnow().isoformat() + "Z"
                a["resolved_by"] = username
                a["updated_at"] = datetime.utcnow().isoformat() + "Z"
                return a
        return None

    def generate_alerts(self) -> Dict:
        """Generate alerts from current data."""
        from app.algorithms import generate_alerts_from_data
        habitations = self.habitations
        sites = self.relocation_sites
        new_alerts = generate_alerts_from_data(habitations, sites)
        for alert_data in reversed(new_alerts):
            alert_data["id"] = len(self.alerts) + 1
            alert_data["is_read"] = 0
            alert_data["created_at"] = datetime.utcnow().isoformat() + "Z"
            alert_data["updated_at"] = datetime.utcnow().isoformat() + "Z"
            self.alerts.insert(0, alert_data)
        return {"generated_count": len(new_alerts)}

    # Report methods
    def get_risk_summary_report(self) -> Dict:
        """Generate risk summary report from Part 6 risk engine calculations."""
        from app.algorithms import assess_all_habitations
        habitations = self.habitations
        hazards = self.hazards
        infrastructure = self.infrastructure
        # hazards is a list of features, extract properties
        hazard_data = [h.get("properties", {}) for h in hazards]
        results = assess_all_habitations(habitations, hazard_data, infrastructure)
        
        total = len(results)
        by_risk = {"CRITICAL": 0, "HIGH": 0, "ELEVATED": 0, "MODERATE": 0, "LOW": 0}
        total_score = 0
        for r in results:
            level = r.risk_level.value if hasattr(r.risk_level, 'value') else r.risk_level
            by_risk[level] = by_risk.get(level, 0) + 1
            total_score += r.overall_score
        return {
            "total_habitations": total,
            "critical": by_risk.get("CRITICAL", 0),
            "high": by_risk.get("HIGH", 0),
            "elevated": by_risk.get("ELEVATED", 0),
            "moderate": by_risk.get("MODERATE", 0),
            "low": by_risk.get("LOW", 0),
            "average_risk_score": round(total_score / total, 1) if total > 0 else 0,
            "risk_distribution": by_risk,
        }

    def get_red_zone_summary_report(self) -> Dict:
        """Generate red-zone/priority summary report from Part 8 data."""
        from app.algorithms import assess_all_priorities
        habitations = self.habitations
        infrastructure = self.infrastructure
        results = assess_all_priorities(habitations, infrastructure)
        
        p_counts = {"P1": 0, "P2": 0, "P3": 0, "P4": 0}
        red_zone = 0
        for r in results:
            p_counts[r.priority_level.value] = p_counts.get(r.priority_level.value, 0) + 1
            if r.priority_level.value in ["P1", "P2"]:
                red_zone += 1
        
        # Get highest priority habitations
        sorted_results = sorted(results, key=lambda r: r.relocation_priority_score, reverse=True)
        highest = [
            {
                "habitation_id": r.habitation_id,
                "habitation_name": r.habitation_name,
                "priority_score": r.relocation_priority_score,
                "priority_level": r.priority_level.value,
                "risk_score": r.risk_score,
                "risk_level": r.risk_level,
                "population": r.population,
            }
            for r in sorted_results[:10]
        ]
        
        return {
            "red_zone_habitations": red_zone,
            "p1_count": p_counts.get("P1", 0),
            "p2_count": p_counts.get("P2", 0),
            "p3_count": p_counts.get("P3", 0),
            "p4_count": p_counts.get("P4", 0),
            "priority_distribution": p_counts,
            "highest_priority_habitations": highest,
        }

    def get_relocation_capacity_report(self) -> Dict:
        """Generate relocation capacity report from Part 7 data."""
        sites = self.relocation_sites
        capacity_assessments = self.capacity_assessments
        
        total_sites = len(sites)
        total_capacity = sum(s.get("total_capacity", 0) for s in sites)
        current_pop = sum(s.get("current_population", 0) for s in sites)
        available_cap = sum(s.get("available_capacity", 0) for s in sites)
        utilization = (current_pop / total_capacity * 100) if total_capacity > 0 else 0
        
        # Capacity scores from assessments
        cap_scores = [c.get("capacity_score", 0) for c in capacity_assessments]
        avg_cap_score = sum(cap_scores) / len(cap_scores) if cap_scores else 0
        
        # Status distribution
        status_dist = {"ADEQUATE": 0, "LIMITED": 0, "STRESSED": 0, "INSUFFICIENT": 0}
        for c in capacity_assessments:
            status = c.get("capacity_status", "ADEQUATE")
            status_dist[status] = status_dist.get(status, 0) + 1
        
        # Stressed/limited sites
        stressed = []
        for s in sites:
            avail = s.get("available_capacity", 0)
            tot = s.get("total_capacity", 0)
            util = (s.get("current_population", 0) / tot * 100) if tot > 0 else 0
            if util >= 75:
                stressed.append({
                    "site_id": s["id"],
                    "site_name": s["name"],
                    "total_capacity": tot,
                    "available_capacity": avail,
                    "utilization_percent": round(util, 1),
                })
        
        return {
            "total_sites": total_sites,
            "total_capacity": total_capacity,
            "current_population": current_pop,
            "available_capacity": available_cap,
            "overall_utilization": round(utilization, 1),
            "average_capacity_score": round(avg_cap_score, 1),
            "status_distribution": status_dist,
            "stressed_limited_sites": stressed,
        }

    def get_relocation_recommendation_report(self) -> Dict:
        """Generate relocation recommendation report from Part 8 data."""
        from app.algorithms import get_all_recommendations
        habitations = self.habitations
        sites = self.relocation_sites
        cap_dict = {}
        for c in self.capacity_assessments:
            cap_dict[c["relocation_site_id"]] = c
        
        recommendations = []
        for hab in habitations:
            result = get_all_recommendations(hab, sites, cap_dict)
            if result.recommendations:
                primary = result.primary_recommendation
                recommendations.append({
                    "habitation_id": result.habitation_id,
                    "habitation_name": result.habitation_name,
                    "priority_level": result.priority_level.value,
                    "priority_score": result.priority_score,
                    "risk_level": result.risk_level,
                    "population": result.population,
                    "recommended_site_id": primary.relocation_site_id if primary else None,
                    "recommended_site_name": primary.site_name if primary else None,
                    "match_score": primary.match_score if primary else None,
                    "suitability": primary.suitability.value if primary else None,
                    "available_capacity": primary.available_capacity if primary else None,
                    "limiting_factors": primary.limiting_factors if primary else [],
                })
        
        return {
            "habitations_requiring_relocation": len(recommendations),
            "recommendations": recommendations,
        }

    def get_report_overview(self) -> Dict:
        """Generate comprehensive report overview."""
        return {
            "risk_summary": self.get_risk_summary_report(),
            "red_zone_summary": self.get_red_zone_summary_report(),
            "capacity_summary": self.get_relocation_capacity_report(),
            "recommendation_summary": self.get_relocation_recommendation_report(),
            "generated_at": datetime.utcnow().isoformat() + "Z",
        }

    def get_dashboard_stats(self) -> Dict:
        hab_stats = self.get_habitation_stats()
        site_stats = self.get_relocation_sites_stats()
        alert_stats = self.get_alerts_stats()

        return {
            "total_habitations": hab_stats["total_habitations"],
            "habitations_by_risk": hab_stats["habitations_by_risk"],
            "habitations_by_hazard": hab_stats["habitations_by_hazard"],
            "total_population": hab_stats["total_population"],
            "high_risk_count": hab_stats["high_risk_count"],
            "critical_risk_count": hab_stats["critical_risk_count"],
            "relocation_sites_count": site_stats["total_sites"],
            "available_capacity": site_stats["available_capacity"],
            "active_alerts": alert_stats["unread"],
            "critical_alerts": alert_stats["critical"],
        }


fallback_service = FallbackDataService()