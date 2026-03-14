import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connect';
import  User  from '@/lib/db/models/User';
import bcrypt from 'bcryptjs';
import { successResponse, errorResponse } from '@/lib/utils/apiResponse';

// Default password for all seeded users
const DEFAULT_PASSWORD = 'Test@12345';

const managers = [
  { empId: 'MNG-001', name: 'Rajesh Kumar', email: 'rajesh.kumar@metaupspace.com', phone: '+919876543001', domain: 'Operations', location: 'Mumbai' },
  { empId: 'MNG-002', name: 'Priya Sharma', email: 'priya.sharma@metaupspace.com', phone: '+919876543002', domain: 'Technical', location: 'Delhi' },
  { empId: 'MNG-003', name: 'Amit Patel', email: 'amit.patel@metaupspace.com', phone: '+919876543003', domain: 'Safety', location: 'Ahmedabad' },
  { empId: 'MNG-004', name: 'Sunita Verma', email: 'sunita.verma@metaupspace.com', phone: '+919876543004', domain: 'HR', location: 'Bangalore' },
  { empId: 'MNG-005', name: 'Vikram Singh', email: 'vikram.singh@metaupspace.com', phone: '+919876543005', domain: 'Quality', location: 'Pune' },
];

const coaches = [
  { empId: 'CH-001', name: 'Deepak Yadav', email: 'deepak.yadav@metaupspace.com', phone: '+919876543011', domain: 'Electrical', location: 'Mumbai' },
  { empId: 'CH-002', name: 'Kavita Nair', email: 'kavita.nair@metaupspace.com', phone: '+919876543012', domain: 'Plumbing', location: 'Delhi' },
  { empId: 'CH-003', name: 'Ravi Shankar', email: 'ravi.shankar@metaupspace.com', phone: '+919876543013', domain: 'Welding', location: 'Chennai' },
  { empId: 'CH-004', name: 'Meena Devi', email: 'meena.devi@metaupspace.com', phone: '+919876543014', domain: 'Safety', location: 'Ahmedabad' },
  { empId: 'CH-005', name: 'Arjun Reddy', email: 'arjun.reddy@metaupspace.com', phone: '+919876543015', domain: 'Carpentry', location: 'Hyderabad' },
];

const staff = [
  { empId: 'SF-001', name: 'Suresh Babu', email: 'suresh.babu@metaupspace.com', phone: '+919876543021', domain: 'Electrical', location: 'Mumbai' },
  { empId: 'SF-002', name: 'Lakshmi Prasad', email: 'lakshmi.prasad@metaupspace.com', phone: '+919876543022', domain: 'Plumbing', location: 'Delhi' },
  { empId: 'SF-003', name: 'Ramesh Gupta', email: 'ramesh.gupta@metaupspace.com', phone: '+919876543023', domain: 'Welding', location: 'Chennai' },
  { empId: 'SF-004', name: 'Anita Kumari', email: 'anita.kumari@metaupspace.com', phone: '+919876543024', domain: 'Safety', location: 'Ahmedabad' },
  { empId: 'SF-005', name: 'Manoj Tiwari', email: 'manoj.tiwari@metaupspace.com', phone: '+919876543025', domain: 'Carpentry', location: 'Hyderabad' },
];

export async function GET(_req: NextRequest) {
  try {
    // Production guard
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SEED !== 'true') {
      return errorResponse('Seed endpoints are disabled in production', 403);
    }

    await connectDB();

    // Check if already seeded
    const existingManager = await User.findOne({ empId: 'MNG-001' });
    if (existingManager) {
      return successResponse({
        message: 'Users already seeded. Delete existing seed users first.',
        credentials: getAllCredentials(),
      });
    }

    // Get admin user for createdBy reference
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      return errorResponse('Admin user not found. Run admin seed first.', 400);
    }

    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 12);
    const createdUsers: { role: string; empId: string; name: string }[] = [];

    // Seed Managers
    for (const mgr of managers) {
      const user = await User.create({
        ...mgr,
        password: hashedPassword,
        role: 'manager',
        status: 'active',
        firstLogin: false,
        createdBy: admin._id,
      });
      createdUsers.push({ role: 'manager', empId: user.empId, name: user.name });
    }

    // Seed Coaches
    for (const coach of coaches) {
      const user = await User.create({
        ...coach,
        password: hashedPassword,
        role: 'coach',
        status: 'active',
        firstLogin: false,
        createdBy: admin._id,
      });
      createdUsers.push({ role: 'coach', empId: user.empId, name: user.name });
    }

    // Seed Staff
    for (const s of staff) {
      const user = await User.create({
        ...s,
        password: hashedPassword,
        role: 'staff',
        status: 'active',
        firstLogin: false,
        createdBy: admin._id,
      });
      createdUsers.push({ role: 'staff', empId: user.empId, name: user.name });
    }

    return successResponse({
      message: `Seeded ${createdUsers.length} users successfully`,
      created: createdUsers,
      credentials: getAllCredentials(),
    }, 'Users seeded', 201);

  } catch (err: any) {
    // Handle duplicate key errors
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      let value: string | undefined = undefined;
      if (field && err.keyValue && typeof err.keyValue === 'object') {
        value = err.keyValue[field as keyof typeof err.keyValue];
      }
      return errorResponse(`Duplicate ${field}: ${value ?? 'unknown'}. Some users may already exist.`, 409);
    }
    console.error('[Seed] Error:', err);
    return errorResponse(err.message || 'Seed failed', 500);
  }
}

function getAllCredentials() {
  return {
    password: DEFAULT_PASSWORD,
    managers: managers.map(m => ({ empId: m.empId, name: m.name })),
    coaches: coaches.map(c => ({ empId: c.empId, name: c.name })),
    staff: staff.map(s => ({ empId: s.empId, name: s.name })),
  };
}
