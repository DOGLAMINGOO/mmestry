import csv
from io import StringIO

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from core.models import Company, Part
from .models import Inventory


class InventoryReportTests(TestCase):
	def setUp(self):
		self.client = APIClient()
		self.user = get_user_model().objects.create_user(username="report-user", password="test-password")
		company = Company.objects.create(code="A", name="Company A")
		company_b = Company.objects.create(code="B", name="Company B")
		part = Part.objects.create(
			part_number="P-100",
			name="Widget",
			cycle_time_minutes=10,
		)
		Inventory.objects.filter(company=company, part=part).update(
			total_blanks=25,
			finished_blanks=7,
		)
		Inventory.objects.filter(company=company_b, part=part).update(
			total_blanks=40,
			finished_blanks=11,
		)

	def test_report_requires_authentication(self):
		response = self.client.get("/api/inventory/report/")

		self.assertEqual(response.status_code, 401)

	def test_report_contains_inventory_quantities(self):
		self.client.force_authenticate(self.user)

		response = self.client.get("/api/inventory/report/")
		rows = list(csv.reader(StringIO(b"".join(response.streaming_content).decode())))

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response["Content-Type"], "text/csv; charset=utf-8")
		self.assertEqual(response["Content-Disposition"], 'attachment; filename="inventory-report.csv"')
		self.assertEqual(rows[0][0:6], [
			"Company",
			"Part Number",
			"Part",
			"Total Blanks",
			"Reserved Blanks",
			"Available Blanks",
		])
		self.assertEqual(rows[1][0:7], ["Company A", "P-100", "Widget", "25", "0", "25", "7"])

	def test_report_can_be_filtered_by_company_code(self):
		self.client.force_authenticate(self.user)

		response = self.client.get("/api/inventory/report/?company=B")
		rows = list(csv.reader(StringIO(b"".join(response.streaming_content).decode())))

		self.assertEqual(len(rows), 2)
		self.assertEqual(rows[1][0:7], ["Company B", "P-100", "Widget", "40", "0", "40", "11"])
