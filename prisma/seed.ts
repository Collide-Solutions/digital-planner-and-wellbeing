import { PrismaClient, LeaveStatus, Role, TaskPriority, TaskStatus } from '@prisma/client';
import pkg from 'bcryptjs';
const { hash } = pkg;

const prisma = new PrismaClient();

// ===== REALISTIC EMPLOYEE DATA =====
const employees = [
  { name: 'Ethan Brooks', email: 'ethan@collideplanner.com', department: 'Engineering' },
  { name: 'Sarah Chen', email: 'sarah@collideplanner.com', department: 'Product' },
  { name: 'Mila Rodriguez', email: 'mila@collideplanner.com', department: 'Design' },
  { name: 'Noah Bennett', email: 'noah@collideplanner.com', department: 'Engineering' },
  { name: 'Olivia Carter', email: 'olivia@collideplanner.com', department: 'Operations' }
];

// ===== 60 REALISTIC OPERATIONAL TASKS =====
const taskData = [
  // -- Ethan Brooks (Engineering) --
  { title: 'Finalize onboarding checklist', desc: 'Complete the new engineer onboarding checklist with security and compliance checkpoints.', priority: TaskPriority.CRITICAL, status: TaskStatus.ACTIVE, hour: 0, proof: false, deadlineDays: 0 },
  { title: 'Resolve deployment blocker', desc: 'The CI/CD pipeline is failing on staging. Investigate and fix the Docker layer caching issue.', priority: TaskPriority.CRITICAL, status: TaskStatus.WAITING_APPROVAL, hour: 1, proof: true, deadlineDays: 0 },
  { title: 'Review customer health report', desc: 'Audit the latest customer health metrics for the Q2 retention analysis.', priority: TaskPriority.HIGH, status: TaskStatus.ACTIVE, hour: 2, proof: false, deadlineDays: 0 },
  { title: 'Audit campaign analytics', desc: 'Cross-reference Google Analytics 4 data with internal campaign tracking.', priority: TaskPriority.HIGH, status: TaskStatus.LOCKED, hour: 3, proof: false, deadlineDays: 1 },
  { title: 'Update API integration docs', desc: 'Document the new REST endpoints for the external partner integration.', priority: TaskPriority.MEDIUM, status: TaskStatus.LOCKED, hour: 4, proof: false, deadlineDays: 2 },
  { title: 'QA payment workflow', desc: 'Run regression tests on the Stripe payment flow for the new subscription tier.', priority: TaskPriority.HIGH, status: TaskStatus.COMPLETED, hour: 5, proof: true, deadlineDays: -1 },
  { title: 'Refactor auth middleware', desc: 'Migrate the legacy auth middleware to the new session-based system.', priority: TaskPriority.LOW, status: TaskStatus.COMPLETED, hour: 6, proof: false, deadlineDays: -2 },
  { title: 'Database indexing audit', desc: 'Review slow queries and recommend indexing strategy for the tasks table.', priority: TaskPriority.MEDIUM, status: TaskStatus.ACTIVE, hour: 7, proof: false, deadlineDays: 1 },
  { title: 'Fix webhook retry logic', desc: 'Webhooks are not being retried on 5xx errors. Fix exponential backoff.', priority: TaskPriority.HIGH, status: TaskStatus.LOCKED, hour: 8, proof: false, deadlineDays: 3 },

  // -- Sarah Chen (Product) --
  { title: 'Prepare sprint handoff', desc: 'Compile sprint notes, KPIs, and stakeholder updates for the end-of-sprint review.', priority: TaskPriority.CRITICAL, status: TaskStatus.WAITING_APPROVAL, hour: 0, proof: true, deadlineDays: 0 },
  { title: 'Weekly KPI reporting', desc: 'Generate and distribute the weekly product KPI dashboard to leadership.', priority: TaskPriority.HIGH, status: TaskStatus.ACTIVE, hour: 1, proof: false, deadlineDays: 0 },
  { title: 'Client delivery review', desc: 'Review the Q2 deliverable document before sending to the enterprise client.', priority: TaskPriority.CRITICAL, status: TaskStatus.ACTIVE, hour: 2, proof: false, deadlineDays: 0 },
  { title: 'Competitor feature audit', desc: 'Document feature gaps between our platform and competitor releases this quarter.', priority: TaskPriority.MEDIUM, status: TaskStatus.LOCKED, hour: 3, proof: false, deadlineDays: 2 },
  { title: 'User interview synthesis', desc: 'Synthesize findings from 8 user interviews into actionable product insights.', priority: TaskPriority.HIGH, status: TaskStatus.LOCKED, hour: 4, proof: false, deadlineDays: 1 },
  { title: 'Roadmap presentation', desc: 'Create the Q3 roadmap presentation for the all-hands meeting.', priority: TaskPriority.MEDIUM, status: TaskStatus.COMPLETED, hour: 5, proof: true, deadlineDays: -1 },
  { title: 'Feature spec review', desc: 'Review the spec for the new analytics dashboard feature.', priority: TaskPriority.LOW, status: TaskStatus.COMPLETED, hour: 6, proof: false, deadlineDays: -3 },
  { title: 'Stakeholder feedback session', desc: 'Schedule and facilitate the monthly stakeholder feedback session.', priority: TaskPriority.MEDIUM, status: TaskStatus.ACTIVE, hour: 7, proof: false, deadlineDays: 1 },

  // -- Mila Rodriguez (Design) --
  { title: 'Design handoff sync', desc: 'Sync with engineering on the finalized design handoff for the planner rebuild.', priority: TaskPriority.CRITICAL, status: TaskStatus.WAITING_APPROVAL, hour: 0, proof: true, deadlineDays: 0 },
  { title: 'Design system v2 audit', desc: 'Audit component usage across the app and identify inconsistencies.', priority: TaskPriority.HIGH, status: TaskStatus.ACTIVE, hour: 1, proof: false, deadlineDays: 0 },
  { title: 'Prototype new dashboard', desc: 'Create Figma prototype for the redesigned analytics dashboard.', priority: TaskPriority.HIGH, status: TaskStatus.ACTIVE, hour: 2, proof: false, deadlineDays: 1 },
  { title: 'User flow optimization', desc: 'Simplify the task creation flow based on usability test findings.', priority: TaskPriority.MEDIUM, status: TaskStatus.LOCKED, hour: 3, proof: false, deadlineDays: 2 },
  { title: 'Icon set refresh', desc: 'Update the icon library with new navigation and status icons.', priority: TaskPriority.LOW, status: TaskStatus.LOCKED, hour: 4, proof: false, deadlineDays: 5 },
  { title: 'Accessibility compliance', desc: 'Run axe-core audit and fix WCAG 2.1 AA violations in the main UI.', priority: TaskPriority.HIGH, status: TaskStatus.COMPLETED, hour: 5, proof: true, deadlineDays: -1 },
  { title: 'Design critique session', desc: 'Lead the weekly design critique session with the product team.', priority: TaskPriority.MEDIUM, status: TaskStatus.ACTIVE, hour: 6, proof: false, deadlineDays: 1 },
  { title: 'Dark mode polish', desc: 'Finalize dark mode color tokens and component overrides.', priority: TaskPriority.LOW, status: TaskStatus.COMPLETED, hour: 7, proof: false, deadlineDays: -2 },

  // -- Noah Bennett (Engineering) --
  { title: 'Fix login regression', desc: 'Users are reporting 401 errors on login after the last auth middleware update.', priority: TaskPriority.CRITICAL, status: TaskStatus.ACTIVE, hour: 0, proof: false, deadlineDays: 0 },
  { title: 'Performance optimization', desc: 'Profile and optimize the dashboard page load time (target: <1.5s TTI).', priority: TaskPriority.HIGH, status: TaskStatus.WAITING_APPROVAL, hour: 1, proof: true, deadlineDays: 0 },
  { title: 'API rate limiting', desc: 'Implement rate limiting middleware for public API endpoints.', priority: TaskPriority.HIGH, status: TaskStatus.LOCKED, hour: 2, proof: false, deadlineDays: 1 },
  { title: 'Notification system refactor', desc: 'Refactor the notification system to use a queue-based architecture.', priority: TaskPriority.MEDIUM, status: TaskStatus.LOCKED, hour: 3, proof: false, deadlineDays: 3 },
  { title: 'Code review: PR #234', desc: 'Review the analytics dashboard feature PR submitted by the team.', priority: TaskPriority.MEDIUM, status: TaskStatus.ACTIVE, hour: 4, proof: false, deadlineDays: 0 },
  { title: 'Unit test coverage', desc: 'Increase unit test coverage for the task engine module to >85%.', priority: TaskPriority.LOW, status: TaskStatus.LOCKED, hour: 5, proof: false, deadlineDays: 7 },
  { title: 'Deploy hotfix v1.2.1', desc: 'Deploy the urgent hotfix for the payment webhook timeout issue.', priority: TaskPriority.CRITICAL, status: TaskStatus.COMPLETED, hour: 6, proof: true, deadlineDays: -1 },
  { title: 'Database migration script', desc: 'Write the migration script for the new analytics event schema.', priority: TaskPriority.MEDIUM, status: TaskStatus.COMPLETED, hour: 7, proof: false, deadlineDays: -2 },

  // -- Olivia Carter (Operations) --
  { title: 'Team standup facilitation', desc: 'Lead the daily standup and update the project board.', priority: TaskPriority.MEDIUM, status: TaskStatus.ACTIVE, hour: 0, proof: false, deadlineDays: 0 },
  { title: 'Vendor contract review', desc: 'Review the SaaS vendor contract renewal terms before the deadline.', priority: TaskPriority.HIGH, status: TaskStatus.WAITING_APPROVAL, hour: 1, proof: true, deadlineDays: 0 },
  { title: 'Incident response drill', desc: 'Run the quarterly incident response drill with the engineering team.', priority: TaskPriority.CRITICAL, status: TaskStatus.ACTIVE, hour: 2, proof: false, deadlineDays: 0 },
  { title: 'Budget reconciliation', desc: 'Reconcile monthly SaaS spending against the allocated budget.', priority: TaskPriority.HIGH, status: TaskStatus.LOCKED, hour: 3, proof: false, deadlineDays: 1 },
  { title: 'Onboarding documentation', desc: 'Update the operations onboarding documentation for new hires.', priority: TaskPriority.MEDIUM, status: TaskStatus.LOCKED, hour: 4, proof: false, deadlineDays: 3 },
  { title: 'Security compliance audit', desc: 'Prepare documentation for the quarterly SOC 2 audit.', priority: TaskPriority.HIGH, status: TaskStatus.COMPLETED, hour: 5, proof: true, deadlineDays: -1 },
  { title: 'Team health survey', desc: 'Distribute and analyze the monthly team health survey results.', priority: TaskPriority.LOW, status: TaskStatus.COMPLETED, hour: 6, proof: false, deadlineDays: -4 },
  { title: 'Office inventory check', desc: 'Verify equipment inventory and order supplies for new team members.', priority: TaskPriority.LOW, status: TaskStatus.ACTIVE, hour: 7, proof: false, deadlineDays: 5 },

  // -- Additional cross-team tasks --
  { title: 'Cross-team sprint retro', desc: 'Facilitate the cross-team sprint retrospective and document action items.', priority: TaskPriority.MEDIUM, status: TaskStatus.ACTIVE, hour: 0, proof: false, deadlineDays: 1 },
  { title: 'API deprecation notice', desc: 'Draft and distribute the deprecation notice for v1 API endpoints.', priority: TaskPriority.HIGH, status: TaskStatus.LOCKED, hour: 1, proof: false, deadlineDays: 2 },
  { title: 'Load testing results', desc: 'Analyze and present the load testing results for the new infrastructure.', priority: TaskPriority.MEDIUM, status: TaskStatus.COMPLETED, hour: 2, proof: true, deadlineDays: -1 },
  { title: 'Error budget review', desc: 'Review SLO/SLI compliance and error budget consumption for the month.', priority: TaskPriority.HIGH, status: TaskStatus.LOCKED, hour: 3, proof: false, deadlineDays: 4 },
  { title: 'Partner integration test', desc: 'End-to-end testing of the new partner API integration.', priority: TaskPriority.CRITICAL, status: TaskStatus.WAITING_APPROVAL, hour: 4, proof: true, deadlineDays: 0 },
  { title: 'Sprint goal alignment', desc: 'Align sprint goals across product, design, and engineering teams.', priority: TaskPriority.HIGH, status: TaskStatus.ACTIVE, hour: 5, proof: false, deadlineDays: 0 },
  { title: 'Release notes v2.0', desc: 'Write comprehensive release notes for the v2.0 launch.', priority: TaskPriority.MEDIUM, status: TaskStatus.LOCKED, hour: 6, proof: false, deadlineDays: 7 },
  { title: 'Customer support triage', desc: 'Triage and categorize the top 10 support tickets from this week.', priority: TaskPriority.HIGH, status: TaskStatus.ACTIVE, hour: 7, proof: false, deadlineDays: 0 },
  { title: 'Infrastructure cost audit', desc: 'Analyze cloud infrastructure costs and identify optimization opportunities.', priority: TaskPriority.MEDIUM, status: TaskStatus.LOCKED, hour: 0, proof: false, deadlineDays: 5 },
  { title: 'Data privacy review', desc: 'Conduct GDPR compliance review of new data collection points.', priority: TaskPriority.HIGH, status: TaskStatus.COMPLETED, hour: 1, proof: true, deadlineDays: -2 },
  { title: 'Feature flag cleanup', desc: 'Remove stale feature flags and clean up the LaunchDarkly configuration.', priority: TaskPriority.LOW, status: TaskStatus.LOCKED, hour: 2, proof: false, deadlineDays: 10 },
  { title: 'Monitoring dashboard', desc: 'Create a new Datadog dashboard for the task execution pipeline.', priority: TaskPriority.MEDIUM, status: TaskStatus.ACTIVE, hour: 3, proof: false, deadlineDays: 2 },
];

async function main() {
  const password = await hash('Collide2026!', 12);

  // ===== WIPE EXISTING DATA =====
  await prisma.notification.deleteMany({});
  await prisma.taskActivityLog.deleteMany({});
  await prisma.requestComment.deleteMany({});
  await prisma.taskRequest.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.announcement.deleteMany({});
  await prisma.leaveRequest.deleteMany({});
  await prisma.dailyReport.deleteMany({});

  // ===== CREATE ADMIN =====
  const admin = await prisma.user.upsert({
    where: { email: 'admin@collideplanner.com' },
    update: { password, role: Role.ADMIN, department: 'Operations', shiftStart: '09:00', shiftEnd: '18:00' },
    create: {
      name: 'Ada Hamilton',
      email: 'admin@collideplanner.com',
      password,
      role: Role.ADMIN,
      department: 'Operations',
      shiftStart: '09:00',
      shiftEnd: '18:00',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ada'
    }
  });

  // ===== CREATE EMPLOYEES =====
  const users = await Promise.all(employees.map((emp, index) =>
    prisma.user.upsert({
      where: { email: emp.email },
      update: { password, role: Role.EMPLOYEE, department: emp.department, shiftStart: '09:00', shiftEnd: '18:00' },
      create: {
        ...emp,
        password,
        role: Role.EMPLOYEE,
        shiftStart: '09:00',
        shiftEnd: '18:00',
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${emp.name.split(' ')[0]}`
      }
    })
  ));

  const allUsers = [admin, ...users];

  // ===== CREATE TASKS WITH REALISTIC DATA =====
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let taskIndex = 0;
  for (const td of taskData) {
    const userIndex = taskIndex % users.length;
    const user = users[userIndex];

    const deadline = new Date(today);
    deadline.setDate(deadline.getDate() + td.deadlineDays);

    const task = await prisma.task.create({
      data: {
        title: td.title,
        description: td.desc,
        priority: td.priority,
        status: td.status,
        requiresProof: td.proof,
        currentHour: td.hour,
        deadline,
        proofUrl: td.status === TaskStatus.WAITING_APPROVAL ? '/uploads/proofs/demo-proof.pdf' : undefined,
        adminApproved: td.status === TaskStatus.COMPLETED,
        assignedById: admin.id,
        assignedToId: user.id,
      }
    });

    await prisma.taskActivityLog.create({
      data: {
        taskId: task.id,
        changedById: admin.id,
        fieldChanged: 'status',
        oldValue: 'PENDING',
        newValue: td.status,
      }
    });

    taskIndex++;
  }

  // ===== ADDITIONAL ETHAN TASKS =====
  const ethanTasks = [
    { title: 'Optimize onboarding flow', desc: 'Refine developer onboarding steps for faster ramp-up.', priority: TaskPriority.HIGH, status: TaskStatus.ACTIVE, hour: 2, proof: false, deadlineDays: 0 },
    { title: 'Finalize release checklist', desc: 'Complete final release readiness checklist for the week.', priority: TaskPriority.CRITICAL, status: TaskStatus.LOCKED, hour: 3, proof: false, deadlineDays: 1 },
    { title: 'Sync with design review', desc: 'Review the latest UX notes and align on delivery timing.', priority: TaskPriority.MEDIUM, status: TaskStatus.ACTIVE, hour: 4, proof: false, deadlineDays: 1 },
    { title: 'Fix analytics event bug', desc: 'Investigate and patch the missing analytics event for page views.', priority: TaskPriority.HIGH, status: TaskStatus.ACTIVE, hour: 5, proof: false, deadlineDays: 0 },
    { title: 'Implement API caching', desc: 'Add cache headers to the public API endpoints.', priority: TaskPriority.MEDIUM, status: TaskStatus.LOCKED, hour: 6, proof: false, deadlineDays: 2 },
    { title: 'Draft release notes', desc: 'Write detailed release notes for the upcoming release.', priority: TaskPriority.LOW, status: TaskStatus.COMPLETED, hour: 7, proof: false, deadlineDays: 3 },
    { title: 'Review security audit', desc: 'Review the latest security audit findings and assign follow-ups.', priority: TaskPriority.HIGH, status: TaskStatus.COMPLETED, hour: 1, proof: false, deadlineDays: 0 },
    { title: 'Resolve support ticket', desc: 'Fix the customer issue reported in ticket #4221.', priority: TaskPriority.CRITICAL, status: TaskStatus.WAITING_APPROVAL, hour: 2, proof: true, deadlineDays: 0 },
    { title: 'Update team docs', desc: 'Refresh the internal docs for feature deployment process.', priority: TaskPriority.MEDIUM, status: TaskStatus.LOCKED, hour: 3, proof: false, deadlineDays: 4 },
    { title: 'Fix CI pipeline', desc: 'Resolve the intermittent CI build failure on branch main.', priority: TaskPriority.HIGH, status: TaskStatus.COMPLETED, hour: 4, proof: false, deadlineDays: 1 },
    { title: 'Review partner integration', desc: 'Validate partner integration requirements and API contract.', priority: TaskPriority.HIGH, status: TaskStatus.ACTIVE, hour: 5, proof: false, deadlineDays: 2 },
    { title: 'Prepare QA regression', desc: 'Prepare the regression checklist for the sprint release.', priority: TaskPriority.MEDIUM, status: TaskStatus.COMPLETED, hour: 6, proof: false, deadlineDays: 2 },
    { title: 'Audit data schema', desc: 'Review the task-related database schema for upcoming changes.', priority: TaskPriority.MEDIUM, status: TaskStatus.ACTIVE, hour: 7, proof: false, deadlineDays: 3 },
    { title: 'Refine notification flow', desc: 'Improve the task notification flow for approvals and deadlines.', priority: TaskPriority.MEDIUM, status: TaskStatus.ACTIVE, hour: 1, proof: false, deadlineDays: 0 },
    { title: 'Plan weekend deploy', desc: 'Plan the weekend deployment steps and rollback policy.', priority: TaskPriority.HIGH, status: TaskStatus.LOCKED, hour: 2, proof: false, deadlineDays: 5 },
    { title: 'Optimize query performance', desc: 'Tune slow database queries in the task dashboard.', priority: TaskPriority.CRITICAL, status: TaskStatus.ACTIVE, hour: 3, proof: false, deadlineDays: 1 },
    { title: 'Build notification dashboard', desc: 'Create a dashboard for tracking task alerts and status.', priority: TaskPriority.LOW, status: TaskStatus.ACTIVE, hour: 4, proof: false, deadlineDays: 6 },
    { title: 'Sync release blockers', desc: 'Coordinate blockers and schedule fixes with the team.', priority: TaskPriority.HIGH, status: TaskStatus.ACTIVE, hour: 5, proof: false, deadlineDays: 0 },
    { title: 'Review sprint goals', desc: 'Review sprint goals and check alignment with roadmap.', priority: TaskPriority.MEDIUM, status: TaskStatus.ACTIVE, hour: 6, proof: false, deadlineDays: 1 },
    { title: 'Clean stale config', desc: 'Remove stale configuration flags and update defaults.', priority: TaskPriority.LOW, status: TaskStatus.ACTIVE, hour: 7, proof: false, deadlineDays: 4 },
  ];

  for (const td of ethanTasks) {
    const deadline = new Date(today);
    deadline.setDate(deadline.getDate() + td.deadlineDays);

    await prisma.task.create({
      data: {
        title: td.title,
        description: td.desc,
        priority: td.priority,
        status: td.status,
        requiresProof: td.proof,
        currentHour: td.hour,
        deadline,
        proofUrl: td.status === TaskStatus.WAITING_APPROVAL ? '/uploads/proofs/demo-proof.pdf' : undefined,
        adminApproved: td.status === TaskStatus.COMPLETED,
        assignedById: admin.id,
        assignedToId: users[0].id,
      }
    });
  }

  // ===== TASK REQUESTS =====
  const requestData = [
    { sender: users[0], receiver: users[1], title: 'Review login QA notes', desc: 'Please review the login regression notes before approval.', priority: TaskPriority.HIGH },
    { sender: users[2], receiver: users[3], title: 'Design handoff validation', desc: 'Validate updated handoff screens for the planner.', priority: TaskPriority.MEDIUM },
    { sender: users[1], receiver: users[0], title: 'Analytics copy review', desc: 'Quick pass on analytics microcopy for the new dashboard.', priority: TaskPriority.LOW },
    { sender: users[3], receiver: users[4], title: 'API rate limit review', desc: 'Need your input on the proposed rate limiting strategy.', priority: TaskPriority.HIGH },
    { sender: users[4], receiver: users[2], title: 'Sprint retro template', desc: 'Review and approve the new sprint retro Miro template.', priority: TaskPriority.MEDIUM },
  ];

  const statuses = ['PENDING', 'PENDING', 'ACCEPTED', 'PENDING', 'DECLINED'] as const;
  for (let i = 0; i < requestData.length; i++) {
    await prisma.taskRequest.create({
      data: {
        senderId: requestData[i].sender.id,
        receiverId: requestData[i].receiver.id,
        title: requestData[i].title,
        description: requestData[i].desc,
        priority: requestData[i].priority,
        status: statuses[i],
      }
    });
  }

  // ===== ANNOUNCEMENTS =====
  await prisma.announcement.createMany({
    data: [
      { title: '🎯 Sprint 12 Kickoff', content: 'Sprint 12 starts today. Focus areas: task execution engine, planner redesign, and API performance optimization. All hands at 10 AM.', createdBy: admin.id },
      { title: '✅ Proof Approval SLA Updated', content: 'All pending proofs should be reviewed within one active work block. Unapproved proofs >4 hours will auto-escalate.', createdBy: admin.id },
      { title: '📅 Friday Workflow Review', content: 'Team leads will review locked tasks and reassignment requests at 4 PM this Friday. Please submit any blockers by 2 PM.', createdBy: admin.id },
      { title: '🚀 v2.0 Launch Update', content: 'The v2.0 launch is on track for next Monday. Final QA and sign-off needed by Friday EOD.', createdBy: admin.id },
      { title: '🔄 Shift Schedule Change', content: 'Starting next week, engineering team shifts move to 8 AM - 5 PM. Operations remains at 9 AM - 6 PM.', createdBy: admin.id },
    ]
  });

  // ===== LEAVE REQUESTS =====
  const leaveStart1 = new Date(today);
  leaveStart1.setDate(leaveStart1.getDate() + 5);
  const leaveEnd1 = new Date(leaveStart1);
  leaveEnd1.setDate(leaveEnd1.getDate() + 2);

  const leaveStart2 = new Date(today);
  leaveStart2.setDate(leaveStart2.getDate() + 2);
  const leaveEnd2 = new Date(leaveStart2);

  await prisma.leaveRequest.createMany({
    data: [
      { userId: users[0].id, reason: 'Focus week for quarterly planning and review', startDate: leaveStart1, endDate: leaveEnd1, status: LeaveStatus.APPROVED },
      { userId: users[2].id, reason: 'Medical appointment - dentist', startDate: leaveStart2, endDate: leaveEnd2, status: LeaveStatus.PENDING },
      { userId: users[4].id, reason: 'Personal day - family event', startDate: new Date(today.getTime() + 10 * 86400000), endDate: new Date(today.getTime() + 10 * 86400000), status: LeaveStatus.PENDING },
    ]
  });

  // ===== DAILY REPORTS =====
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  for (const user of users) {
    // Yesterday's report
    await prisma.dailyReport.create({
      data: {
        userId: user.id,
        date: yesterday,
        completedTasks: Math.floor(Math.random() * 3) + 1,
        pendingTasks: Math.floor(Math.random() * 3) + 1,
        summary: `${user.name} completed key milestones and has open items awaiting review.`,
      }
    });

    // Today's report
    await prisma.dailyReport.create({
      data: {
        userId: user.id,
        date: today,
        completedTasks: Math.floor(Math.random() * 2),
        pendingTasks: Math.floor(Math.random() * 4) + 2,
        summary: `${user.name} has active work blocks and approval checkpoints ready for review.`,
      }
    });
  }

  // ===== NOTIFICATIONS =====
  const notificationData = [];

  // Admin notifications
  notificationData.push(
    { userId: admin.id, title: 'Proof uploaded', message: 'Sarah Chen submitted proof for "Design handoff sync". Ready for review.', type: 'proof_uploaded', entityType: 'task' },
    { userId: admin.id, title: 'Approval pending', message: 'Ethan Brooks has 2 tasks waiting for your approval.', type: 'approval_pending', entityType: 'task' },
    { userId: admin.id, title: 'Sprint sync rescheduled', message: 'Friday sprint sync moved to 4 PM due to stakeholder conflict.', type: 'schedule_change', entityType: 'task' },
    { userId: admin.id, title: 'Leave request pending', message: 'Mila Rodriguez has a leave request awaiting decision.', type: 'leave_request', entityType: 'task' },
    { userId: admin.id, title: 'Shift reminder', message: 'Reminder: New shift schedule starts next Monday at 8 AM.', type: 'reminder', entityType: 'task' },
  );

  // Employee notifications
  for (const user of users) {
    notificationData.push(
      { userId: user.id, title: 'Task assigned', message: 'You have new tasks scheduled for today. Check your planner to organize.', type: 'task_assigned', entityType: 'task' },
      { userId: user.id, title: 'Approval reminder', message: 'You have pending approvals. Please review within the next hour.', type: 'approval_reminder', entityType: 'task' },
      { userId: user.id, title: 'Sprint sync moved', message: 'The end-of-sprint sync has been moved to 4 PM today.', type: 'schedule_change', entityType: 'task' },
    );

    // Random additional notification
    if (Math.random() > 0.5) {
      notificationData.push({
        userId: user.id,
        title: `Proof ${Math.random() > 0.5 ? 'approved' : 'rejected'}`,
        message: `Admin has ${Math.random() > 0.5 ? 'approved' : 'rejected your proof for review'}.`,
        type: 'proof_action',
        entityType: 'task'
      });
    }
  }

  await prisma.notification.createMany({ data: notificationData });

  // ===== ADD ACTIVITY LOGS FOR CROSS-REFERENCING =====
  const allTasks = await prisma.task.findMany({ take: 10 });
  for (const task of allTasks) {
    await prisma.taskActivityLog.create({
      data: {
        taskId: task.id,
        changedById: admin.id,
        fieldChanged: 'deadline',
        oldValue: new Date(today.getTime() + 86400000).toISOString(),
        newValue: task.deadline?.toISOString() ?? null,
      }
    });
  }

  console.log('✅ Seed complete!');
  console.log(`   Admin: admin@collideplanner.com / Collide2026!`);
  console.log(`   Employees: ${users.map(u => u.email).join(', ')}`);
  console.log(`   Tasks created: ${taskIndex}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});