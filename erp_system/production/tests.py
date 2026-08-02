from django.contrib.auth import get_user_model
from django.test import TestCase

from core.models import Client, Company, Part
from customer_order.models import CustomerOrder
from .models import ProductionReport
from .serializers import ProductionReportSerializer


class ProductionReportSerializerTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username='tester', password='pass1234')
        self.company = Company.objects.create(code='A', name='Acme')
        self.client = Client.objects.create(name='Test Client')
        self.part = Part.objects.create(part_number='P-001', name='Widget', description='Test part', cycle_time_minutes=5)
        self.customer_order = CustomerOrder.objects.create(
            po_number='PO-A-001',
            company=self.company,
            client=self.client,
            part=self.part,
            quantity=10,
            deadline='2026-07-10',
            status=CustomerOrder.STATUS_APPROVED,
            created_by=self.user,
        )

    def test_completion_requires_finished_quantity_to_meet_or_exceed_target(self):
        report = ProductionReport(
            customer_order=self.customer_order,
            machine_name='M1',
            operator_name='O1',
            deadline='2026-07-10',
            required_quantity=10,
            produced_quantity=7,
            start_time='2026-07-03T10:00:00Z',
            created_by=self.user,
        )

        serializer = ProductionReportSerializer(report, data={'produced_quantity': 2, 'status': 'COMPLETED'}, partial=True)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data['status'], ProductionReport.STATUS_IN_PROGRESS)

        serializer = ProductionReportSerializer(report, data={'produced_quantity': 3, 'status': 'COMPLETED'}, partial=True)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data['produced_quantity'], 10)
        self.assertEqual(serializer.validated_data['status'], ProductionReport.STATUS_COMPLETED)

    def test_partial_update_accumulates_finished_quantity(self):
        report = ProductionReport(
            customer_order=self.customer_order,
            machine_name='M1',
            operator_name='O1',
            deadline='2026-07-10',
            required_quantity=100,
            produced_quantity=80,
            start_time='2026-07-03T10:00:00Z',
            created_by=self.user,
        )

        serializer = ProductionReportSerializer(report, data={'produced_quantity': 10}, partial=True)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data['produced_quantity'], 90)

    def test_partial_update_handles_string_quantity_payloads(self):
        report = ProductionReport(
            customer_order=self.customer_order,
            machine_name='M1',
            operator_name='O1',
            deadline='2026-07-10',
            required_quantity=100,
            produced_quantity=80,
            start_time='2026-07-03T10:00:00Z',
            created_by=self.user,
        )

        serializer = ProductionReportSerializer(report, data={'produced_quantity': '10'}, partial=True)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data['produced_quantity'], 90)

    def test_partial_update_accumulates_labor_fields(self):
        report = ProductionReport(
            customer_order=self.customer_order,
            machine_name='M1',
            operator_name='O1',
            deadline='2026-07-10',
            required_quantity=100,
            produced_quantity=80,
            operator_working_hours=8.0,
            parts_made_in_working_hours=80,
            operator_overtime_hours=0.0,
            parts_made_in_overtime=0,
            idle_time_hours=0.0,
            start_time='2026-07-03T10:00:00Z',
            created_by=self.user,
        )

        serializer = ProductionReportSerializer(
            report,
            data={
                'operator_working_hours': '1.0',
                'parts_made_in_working_hours': '10',
                'operator_overtime_hours': '0.5',
                'parts_made_in_overtime': '2',
                'idle_time_hours': '0.5',
                'idle_reason': 'Machine setup',
            },
            partial=True,
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data['operator_working_hours'], 9.0)
        self.assertEqual(serializer.validated_data['parts_made_in_working_hours'], 90)
        self.assertEqual(serializer.validated_data['operator_overtime_hours'], 0.5)
        self.assertEqual(serializer.validated_data['parts_made_in_overtime'], 2)
        self.assertEqual(serializer.validated_data['idle_time_hours'], 0.5)
