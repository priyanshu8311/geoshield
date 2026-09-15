import unittest

from fastapi.testclient import TestClient

from app.main import app
from app import database


class RelocationPrioritySecurityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Exercise the deterministic fallback users and sample assignments.
        cls._previous_db_available = getattr(database, "_db_available")
        setattr(database, "_db_available", False)
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        setattr(database, "_db_available", cls._previous_db_available)
        super().tearDownClass()

    def login_as_field_officer(self):
        response = self.client.post(
            "/api/auth/login",
            json={"username": "field", "password": "Demo@123"},
        )
        self.assertEqual(response.status_code, 200)
        return {"Authorization": f"Bearer {response.json()['access_token']}"}

    def test_relocation_priority_requires_authentication(self):
        response = self.client.get("/api/relocation-priority")

        self.assertEqual(response.status_code, 401)

    def test_field_officer_cannot_request_unassigned_detail(self):
        headers = self.login_as_field_officer()

        response = self.client.get(
            "/api/relocation-priority/H003/recommendations",
            headers=headers,
        )

        self.assertEqual(response.status_code, 403)

    def test_field_officer_list_and_all_recommendations_are_scoped(self):
        headers = self.login_as_field_officer()

        priorities = self.client.get(
            "/api/relocation-priority",
            headers=headers,
        )
        all_recommendations = self.client.get(
            "/api/relocation-priority/recommendations",
            headers=headers,
        )

        self.assertEqual(priorities.status_code, 200)
        self.assertEqual(all_recommendations.status_code, 200)
        self.assertTrue(
            {item["habitation_id"] for item in priorities.json()["relocation_priorities"]}
            <= {"H001", "H002"}
        )
        self.assertTrue(
            {item["habitation_id"] for item in all_recommendations.json()}
            <= {"H001", "H002"}
        )


if __name__ == "__main__":
    unittest.main()