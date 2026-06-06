import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate, useParams, useLocation, useSearchParams } from 'react-router-dom';
import { 
  Car, 
  ClipboardCheck, 
  FileText, 
  LayoutDashboard, 
  ShieldCheck, 
  LogOut, 
  Plus, 
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Menu,
  X,
  ChevronRight,
  Gauge,
  Droplets,
  Settings,
  Users,
  Activity,
  Image as ImageIcon,
  Edit2,
  Trash2,
  AlertCircle,
  QrCode
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { apiRequest, cn } from './lib/api';
import { User, Vehicle, CalibrationReport, AuditLog } from './types';

// --- Components ---

const OnboardModal = ({ isOpen, onClose, onSuccess, vehicle }: { isOpen: boolean; onClose: () => void; onSuccess: () => void; vehicle?: Vehicle | null }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    registrationNumber: '',
    bulkNumber: '',
    omc: '',
    nominalCapacity: '',
    expirationDate: '',
    vin: '',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    ownerName: '',
    ownerPhone: '',
    ownerEmail: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const isEdit = !!vehicle;

  useEffect(() => {
    if (vehicle) {
      setFormData({
        registrationNumber: vehicle.registrationNumber,
        bulkNumber: vehicle.bulkNumber || '',
        omc: vehicle.omc || '',
        nominalCapacity: vehicle.nominalCapacity || '',
        expirationDate: vehicle.expirationDate ? new Date(vehicle.expirationDate).toISOString().split('T')[0] : '',
        vin: vehicle.vin || '',
        make: vehicle.make || '',
        model: vehicle.model || '',
        year: vehicle.year || new Date().getFullYear(),
        ownerName: vehicle.ownerName || '',
        ownerPhone: vehicle.ownerPhone || '',
        ownerEmail: vehicle.ownerEmail || ''
      });
    } else {
      resetForm();
    }
  }, [vehicle, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const url = isEdit ? `/vehicles/${vehicle?.id}` : '/vehicles';
      const method = isEdit ? 'PUT' : 'POST';
      
      await apiRequest(url, {
        method,
        body: JSON.stringify({
          ...formData
        })
      });
      onSuccess();
      onClose();
      resetForm();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ 
      registrationNumber: '',
      bulkNumber: '',
      omc: '',
      nominalCapacity: '',
      expirationDate: '',
      vin: '', make: '', model: '', year: new Date().getFullYear(),
      ownerName: '', ownerPhone: '', ownerEmail: '' 
    });
    setStep(1);
  };

  if (!isOpen) return null;

  const nextStep = () => setStep(s => Math.min(s + 1, 3));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-4xl bg-white rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col md:flex-row h-auto max-h-[90vh]"
      >
        {/* Left side: Progress */}
        <div className="w-full md:w-1/3 bg-[#f8fafc] relative min-h-[200px] flex flex-col items-center justify-center border-r border-border overflow-hidden p-8 text-center">
          {/* Transparent Pattern Layer */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
          
          <div className="relative z-10 w-full flex flex-col items-center gap-8">
            {/* Step Indicators */}
            <div className="flex items-center gap-2 w-full max-w-[200px]">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex-1 h-1 rounded-full relative overflow-hidden bg-slate-200">
                  <motion.div 
                    initial={false}
                    animate={{ width: step >= i ? '100%' : '0%' }}
                    className="absolute inset-0 bg-accent-blue"
                  />
                </div>
              ))}
            </div>

            <div>
              <h4 className="text-slate-900 text-xl font-bold tracking-tight">
                {step === 1 ? 'Unit Identification' : step === 2 ? 'Operator Assignment' : 'Final Review'}
              </h4>
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mt-1">Step {step} of 3</p>
            </div>
            
            <div className="p-6 bg-white rounded-2xl border border-border shadow-sm w-full">
              <div className="flex flex-col gap-4 text-left">
                <div className="flex items-center gap-3">
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500", step >= 1 ? "bg-accent-blue text-white shadow-lg shadow-accent-blue/20" : "bg-slate-100 text-slate-400")}>1</div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 leading-none mb-1">Technical</p>
                    <p className={cn("text-xs font-bold transition-colors duration-500", step >= 1 ? "text-slate-900" : "text-slate-300")}>Unit Identity</p>
                  </div>
                </div>
                <div className="w-px h-4 bg-slate-100 ml-4" />
                <div className="flex items-center gap-3">
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500", step >= 2 ? "bg-accent-blue text-white shadow-lg shadow-accent-blue/20" : "bg-slate-100 text-slate-400")}>2</div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 leading-none mb-1">Ownership</p>
                    <p className={cn("text-xs font-bold transition-colors duration-500", step >= 2 ? "text-slate-900" : "text-slate-300")}>Operator Data</p>
                  </div>
                </div>
                <div className="w-px h-4 bg-slate-100 ml-4" />
                <div className="flex items-center gap-3">
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500", step >= 3 ? "bg-accent-blue text-white shadow-lg shadow-accent-blue/20" : "bg-slate-100 text-slate-400")}>3</div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 leading-none mb-1">Verification</p>
                    <p className={cn("text-xs font-bold transition-colors duration-500", step >= 3 ? "text-slate-900" : "text-slate-300")}>Onboarding Sync</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right side: Multi-step Form */}
        <div className="flex-1 flex flex-col bg-white">
          <div className="p-8 border-b border-border flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold tracking-tight">{isEdit ? 'Revision: ' + vehicle?.vin : 'Onboard New Unit'}</h3>
              <p className="text-[10px] text-text-secondary uppercase font-bold tracking-widest mt-0.5">{isEdit ? 'Technical Update Sequence' : 'Asset Enrollment Protocol'}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-bg-main rounded-lg text-text-secondary transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8">
            {error && (
              <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl mb-6 flex items-center gap-3 text-xs font-bold">
                <XCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div 
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <h5 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Unit Identity Protocol</h5>
                      <div>
                        <label className="info-label">Vehicle registration number</label>
                        <input 
                          type="text" 
                          className="w-full p-4 bg-bg-main border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent-blue/20 font-bold text-sm uppercase"
                          placeholder="EX: KAA-123A"
                          value={formData.registrationNumber}
                          onChange={e => setFormData({ ...formData, registrationNumber: e.target.value.toUpperCase() })}
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="info-label">Bulk Number</label>
                          <input 
                            type="text" 
                            className="w-full p-4 bg-bg-main border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent-blue/20 text-sm font-bold"
                            placeholder="EX: BN-8890"
                            value={formData.bulkNumber}
                            onChange={e => setFormData({ ...formData, bulkNumber: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="info-label">OMC</label>
                          <input 
                            type="text" 
                            className="w-full p-4 bg-bg-main border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent-blue/20 text-sm font-bold"
                            placeholder="EX: Shell BP"
                            value={formData.omc}
                            onChange={e => setFormData({ ...formData, omc: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="info-label">Nominal Capacity</label>
                          <input 
                            type="text" 
                            className="w-full p-4 bg-bg-main border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent-blue/20 text-sm font-bold"
                            placeholder="EX: 28,000 L"
                            value={formData.nominalCapacity}
                            onChange={e => setFormData({ ...formData, nominalCapacity: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="info-label">Expiration Date</label>
                          <input 
                            type="date" 
                            className="w-full p-4 bg-bg-main border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent-blue/20 text-sm font-bold"
                            value={formData.expirationDate}
                            onChange={e => setFormData({ ...formData, expirationDate: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="pt-4 border-t border-border mt-4">
                        <button 
                          type="button" 
                          onClick={() => {}} 
                          className="text-[10px] text-accent-blue font-bold uppercase tracking-widest"
                        >
                          Additional Technical Data (Optional)
                        </button>
                        <div className="grid grid-cols-2 gap-4 mt-4">
                          <div>
                            <label className="info-label">VIN (Optional)</label>
                            <input 
                              type="text" 
                              className="w-full p-3 bg-bg-main border border-border rounded-lg outline-none text-xs font-bold"
                              value={formData.vin}
                              onChange={e => setFormData({ ...formData, vin: e.target.value.toUpperCase() })}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="info-label">Make</label>
                              <input 
                                type="text" 
                                className="w-full p-3 bg-bg-main border border-border rounded-lg outline-none text-xs font-bold"
                                value={formData.make}
                                onChange={e => setFormData({ ...formData, make: e.target.value })}
                              />
                            </div>
                            <div>
                              <label className="info-label">Model</label>
                              <input 
                                type="text" 
                                className="w-full p-3 bg-bg-main border border-border rounded-lg outline-none text-xs font-bold"
                                value={formData.model}
                                onChange={e => setFormData({ ...formData, model: e.target.value })}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div 
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="space-y-4">
                    <h5 className="text-xs font-bold uppercase tracking-widest text-accent-blue">Operator Assignment</h5>
                    <div>
                      <label className="info-label">Full Name of Car User</label>
                      <input 
                        type="text" 
                        className="w-full p-4 bg-bg-main border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent-blue/20 text-sm font-bold"
                        placeholder="EX: Johnathan Silver"
                        value={formData.ownerName}
                        onChange={e => setFormData({ ...formData, ownerName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="info-label">Contact Phone</label>
                      <input 
                        type="tel" 
                        className="w-full p-4 bg-bg-main border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent-blue/20 text-sm font-bold"
                        placeholder="EX: +1 (555) 000-0000"
                        value={formData.ownerPhone}
                        onChange={e => setFormData({ ...formData, ownerPhone: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="info-label">Corporate Email</label>
                      <input 
                        type="email" 
                        className="w-full p-4 bg-bg-main border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent-blue/20 text-sm font-bold"
                        placeholder="EX: operator@enterprise.com"
                        value={formData.ownerEmail}
                        onChange={e => setFormData({ ...formData, ownerEmail: e.target.value })}
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div 
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="space-y-6">
                    <h5 className="text-xs font-bold uppercase tracking-widest text-accent-blue">Final Validation</h5>
                    
                    <div className="p-6 bg-bg-main border border-border rounded-2xl flex items-start gap-4">
                      <div className="p-3 bg-white rounded-xl border border-border">
                        <Car className="text-accent-blue" size={24} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-text-primary">{formData.registrationNumber || 'NEW UNIT'}</p>
                        <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest font-mono mt-1">OMC: {formData.omc || 'N/A'} | BULK: {formData.bulkNumber || 'N/A'} | CAP: {formData.nominalCapacity || 'N/A'}</p>
                        {formData.expirationDate && (
                          <div className="flex items-center gap-1 mt-1 text-[10px] font-bold text-orange-600">
                             <Clock size={10} />
                             EXP: {new Date(formData.expirationDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-6 bg-accent-blue/[0.03] border border-accent-blue/10 rounded-2xl flex items-start gap-4">
                      <div className="p-3 bg-white rounded-xl border border-border">
                        <Users className="text-accent-blue" size={24} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-text-primary">{formData.ownerName || 'Unknown Operator'}</p>
                        <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mt-1">{formData.ownerEmail || 'No Email Assigned'}</p>
                      </div>
                    </div>

                    <p className="text-xs text-text-secondary font-medium leading-relaxed bg-slate-50 p-4 rounded-xl border border-border">
                      By proceeding, you verify that the above technical specifications and operator assignments are accurate for legal calibration certification.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="p-8 border-t border-border flex gap-4 bg-slate-50/50">
            {step > 1 && (
              <button 
                type="button" 
                onClick={prevStep}
                className="btn-secondary flex-1 h-14"
              >
                Previous Step
              </button>
            )}
            {step < 3 ? (
              <button 
                type="button" 
                onClick={nextStep}
                disabled={step === 1 && !formData.registrationNumber}
                className="btn-primary flex-1 h-14"
              >
                Continue Protocol
              </button>
            ) : (
              <button 
                type="button" 
                onClick={handleSubmit}
                disabled={loading}
                className="btn-primary flex-[2] h-14 bg-emerald-600 hover:bg-emerald-700 border-emerald-700 font-bold"
              >
                {loading ? 'Finalizing Enrollment...' : 'Finalize & Onboard Unit'}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const AddUserModal = ({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess: () => void }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'technician' as 'admin' | 'technician'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await apiRequest('/users', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      onSuccess();
      onClose();
      setFormData({ email: '', password: '', name: '', role: 'technician' });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-2xl border border-border shadow-2xl overflow-hidden p-8"
      >
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-xl font-black tracking-tight text-text-primary">Establish New Node</h3>
            <p className="text-xs text-text-secondary mt-1 font-medium italic serif">Register professional personnel into the service cluster.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-bg-main rounded-full text-text-secondary">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-xs font-bold flex items-center gap-2">
            <XCircle size={14} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="info-label italic serif">Full Identification Name</label>
              <input 
                type="text" 
                className="w-full p-3 bg-bg-main border border-border rounded-lg outline-none focus:ring-2 focus:ring-accent-blue/20 text-sm font-semibold"
                placeholder="EX: Alex Thompson"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="info-label italic serif">Authentication Email</label>
              <input 
                type="email" 
                className="w-full p-3 bg-bg-main border border-border rounded-lg outline-none focus:ring-2 focus:ring-accent-blue/20 text-sm font-semibold"
                placeholder="alex.t@vcalibrate.com"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="info-label italic serif">Initial Security Key</label>
              <input 
                type="password" 
                className="w-full p-3 bg-bg-main border border-border rounded-lg outline-none focus:ring-2 focus:ring-accent-blue/20 text-sm font-semibold"
                placeholder="Min 6 characters"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={6}
              />
            </div>
            <div>
              <label className="info-label italic serif">Clearance Protocol</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'technician' })}
                  className={cn(
                    "p-3 rounded-lg border text-xs font-bold tracking-widest transition-all",
                    formData.role === 'technician' 
                      ? "bg-bg-main border-accent-blue text-accent-blue" 
                      : "bg-white border-border text-text-secondary opacity-60 hover:opacity-100"
                  )}
                >
                  TECHNICIAN
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'admin' })}
                  className={cn(
                    "p-3 rounded-lg border text-xs font-bold tracking-widest transition-all",
                    formData.role === 'admin' 
                      ? "bg-bg-main border-accent-blue text-accent-blue" 
                      : "bg-white border-border text-text-secondary opacity-60 hover:opacity-100"
                  )}
                >
                  ADMINISTRATOR
                </button>
              </div>
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              Abort
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="btn-primary flex-1"
            >
              {loading ? 'Establishing...' : 'Commit Protocol'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const Sidebar = ({ user, onLogout }: { user: User; onLogout: () => void }) => {
  return (
    <div className="w-60 bg-bg-sidebar text-white h-screen fixed left-0 top-0 overflow-y-auto p-6 z-50 flex flex-col">
      <div className="logo mb-12 flex items-center gap-2 text-xl font-extrabold tracking-tight">
        <ShieldCheck className="w-6 h-6 text-accent-blue" />
        ELI VCS
      </div>

      <nav className="space-y-2 flex-1">
        <SidebarLink to="/" icon={<LayoutDashboard size={18} />} label="Calibration Lab" />
        <SidebarLink to="/vehicles" icon={<Car size={18} />} label="Vehicle Fleet" />
        <SidebarLink to="/pressure-calibration" icon={<Gauge size={18} />} label="Pressure Calibration" />
        <SidebarLink to="/tank-calibration" icon={<Droplets size={18} />} label="Tank Calibration" />
        {user.role === 'technician' && (
          <SidebarLink to="/compare" icon={<ClipboardCheck size={18} />} label="New Session" />
        )}
        <SidebarLink to="/reports" icon={<FileText size={18} />} label="History Log" />
        {user.role === 'admin' && (
          <SidebarLink to="/settings" icon={<Settings size={18} />} label="System Settings" />
        )}
      </nav>

      <div className="mt-auto pt-6 border-t border-white/10">
        <div className="mb-6">
          <p className="info-label text-white/40">Active Operator</p>
          <div className="flex items-center gap-2">
            <span className="badge-role bg-white/10 text-white border border-white/20 px-2 py-0.5 rounded text-[10px] font-bold">
              {user.role.toUpperCase()}
            </span>
            <p className="font-semibold text-sm truncate">{user.name}</p>
          </div>
        </div>
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-3 p-3 text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-sm"
        >
          <LogOut size={18} />
          <span>Exit System</span>
        </button>
      </div>
    </div>
  );
};

const SidebarLink = ({ to, icon, label }: { to: string; icon: any; label: string }) => {
  const { pathname } = useLocation();
  const isActive = pathname === to || (to !== '/' && pathname.startsWith(to));

  return (
    <Link 
      to={to} 
      className={cn("sidebar-nav-item", isActive && "active")}
    >
      <span className={cn("transition-opacity", isActive ? "opacity-100" : "opacity-70")}>{icon}</span>
      <span className="font-medium tracking-tight whitespace-nowrap">{label}</span>
    </Link>
  );
};

const Navbar = ({ title }: { title: string }) => (
  <header className="h-16 border-b border-line flex items-center justify-between px-8 bg-bg sticky top-0 z-40">
    <h2 className="text-xl font-bold tracking-tight">{title}</h2>
  </header>
);

const Loader = () => (
  <div className="flex items-center justify-center p-12">
    <div className="w-8 h-8 border-4 border-accent-blue/10 border-t-accent-blue rounded-full animate-spin"></div>
  </div>
);

// --- Pages ---

const LoginPage = ({ onLoginSuccess }: { onLoginSuccess: (token: string, user: User) => void }) => {
  const [email, setEmail] = useState('admin@autocal.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-main flex items-center justify-center">
      <div className="w-full max-w-md p-10 bg-white border border-border rounded-2xl shadow-xl">
        <div className="mb-10 text-center">
          <ShieldCheck className="w-12 h-12 mx-auto mb-4 text-accent-blue" />
          <h1 className="text-3xl tracking-tight text-text-primary mb-1">ELI VCS</h1>
          <p className="text-text-secondary text-[10px] tracking-widest uppercase font-bold">Calibration Management Intelligence</p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-lg mb-6 flex items-center gap-2 text-xs font-semibold">
            <XCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="info-label">Operator Identity</label>
            <input 
              type="email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full p-3 border border-border rounded-lg bg-bg-main focus:ring-2 focus:ring-accent-blue/20 outline-none text-sm font-medium"
              required
            />
          </div>
          <div>
            <label className="info-label">Security Protocol Key</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full p-3 border border-border rounded-lg bg-bg-main focus:ring-2 focus:ring-accent-blue/20 outline-none text-sm font-medium"
              required
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full btn-primary h-12 flex items-center justify-center"
          >
            {loading ? 'Authenticating...' : 'Enter Secure Environment'}
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-border text-[10px] text-text-secondary leading-relaxed font-semibold uppercase text-center opacity-70">
          This terminal is restricted to registered technicians.
        </div>
      </div>
    </div>
  );
};

const DashboardPage = () => {
  const [stats, setStats] = useState({ vehicles: 0, reports: 0, pending: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const vehicles = await apiRequest('/vehicles');
        const reports = await apiRequest('/reports');
        setStats({
          vehicles: vehicles.length,
          reports: reports.length,
          pending: reports.filter((r: any) => r.status === 'pending').length
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <Loader />;

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-2">
        <div className="text-sm text-text-secondary font-medium">System / <span className="text-text-primary font-bold">Calibration Hub</span></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Unit Inventory" value={stats.vehicles} icon={<Car />} />
        <StatCard label="Completed Checks" value={stats.reports} icon={<FileText />} />
        <StatCard label="Awaiting Verification" value={stats.pending} icon={<Clock />} accent={true} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-sm">
        <div className="lg:col-span-2 space-y-8">
          <div className="card">
            <h3 className="text-base text-text-primary mb-6 font-bold uppercase tracking-tight">Active Operation Protocols</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link to="/pressure-calibration" className="flex items-center gap-4 p-5 rounded-2xl bg-[#eff6ff] hover:bg-accent-blue/10 border border-transparent hover:border-accent-blue/20 transition-all group">
                <div className="p-3 bg-white rounded-xl text-accent-blue shadow-sm group-hover:shadow-md transition-all">
                  <Gauge size={24} />
                </div>
                <div>
                  <p className="font-bold text-text-primary">Pressure Calibration</p>
                  <p className="text-[11px] text-text-secondary">Pneumatic integrity analysis</p>
                </div>
              </Link>
              <Link to="/tank-calibration" className="flex items-center gap-4 p-5 rounded-2xl bg-[#fff7ed] hover:bg-orange-500/10 border border-transparent hover:border-orange-500/20 transition-all group">
                <div className="p-3 bg-white rounded-xl text-orange-500 shadow-sm group-hover:shadow-md transition-all">
                  <Droplets size={24} />
                </div>
                <div>
                  <p className="font-bold text-text-primary">Tank Calibration</p>
                  <p className="text-[11px] text-text-secondary">UST volume & level accuracy</p>
                </div>
              </Link>
            </div>
          </div>

          <div className="card">
            <h3 className="text-base text-text-primary mb-6">Recent Fleet Activity</h3>
            <div className="space-y-4">
              <StatusRow label="System Database Connection" status="Optimal" />
              <StatusRow label="Certificate Generation Engine" status="Online" />
              <StatusRow label="Calibration Logic Core" status="Validated" />
            </div>
          </div>
        </div>

        <div className="card bg-accent-blue text-white border-none flex flex-col justify-center items-center text-center p-8 gap-4">
          <ShieldCheck size={48} className="opacity-40" />
          <div>
            <h4 className="text-lg font-bold mb-1">Standard Operating Protocol</h4>
            <p className="opacity-80 leading-relaxed text-xs font-medium">
              Maintain clean sensor interfaces during every calibration cycle to ensure zero-deviation reports.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, unit, icon, accent = false }: any) => (
  <div className="card flex justify-between items-center group hover:border-accent-blue transition-colors">
    <div>
      <p className="info-label">{label}</p>
      <div className="flex items-baseline gap-1">
        <p className={cn("text-4xl font-extrabold tracking-tighter", accent ? "text-orange-500" : "text-text-primary")}>{value}</p>
        {unit && <span className="text-xs font-bold text-text-secondary uppercase">{unit}</span>}
      </div>
    </div>
    <div className={cn("p-3 rounded-xl bg-bg-main", accent ? "text-orange-500" : "text-accent-blue")}>{icon}</div>
  </div>
);

const StatusRow = ({ label, status }: any) => (
  <div className="flex justify-between items-center py-4 border-b border-border last:border-0 grow">
    <span className="info-label !mb-0">{label}</span>
    <span className="text-[10px] font-bold text-accent-blue uppercase px-3 py-1 bg-accent-blue/10 rounded-full tracking-wider">{status}</span>
  </div>
);

const VehiclesPage = ({ user }: { user: User }) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);

  const fetchVehicles = () => {
    apiRequest(`/vehicles?registrationNumber=${search}`).then(setVehicles).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchVehicles();
  }, [search]);

  const handleEdit = (v: Vehicle) => {
    setEditingVehicle(v);
    setIsModalOpen(true);
  };

  const handleDelete = async (v: Vehicle) => {
    if (confirmingId !== v.id) {
      setConfirmingId(v.id);
      setTimeout(() => setConfirmingId(null), 3000); // Reset after 3 seconds
      return;
    }

    console.log(`[FLEET] Initiate decommissioning for unit: ${v.registrationNumber}`);
    setLoading(true);
    try {
      await apiRequest(`/vehicles/${v.id}`, { method: 'DELETE' });
      console.log(`[FLEET] Successfully decommissioned unit: ${v.registrationNumber}`);
      setConfirmingId(null);
      fetchVehicles();
    } catch (err: any) {
      console.error(`[FLEET] Decommissioning failure for unit ${v.registrationNumber}:`, err);
      alert(err.message);
      setLoading(false);
      setConfirmingId(null);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
          <input 
            type="text" 
            placeholder="Search within fleet (Reg No)..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-border rounded-lg outline-none focus:ring-2 focus:ring-accent-blue/10 text-sm font-medium"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button 
          onClick={() => {
            setEditingVehicle(null);
            setIsModalOpen(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} />
          <span>Onboard New Unit</span>
        </button>
      </div>

      <div className="bg-white border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="grid grid-cols-[1fr_0.8fr_0.8fr_1fr_1fr_0.8fr_1fr_auto_auto] bg-[#f8fafc] border-b border-border">
          <div className="table-header-cell px-6">Reg Number</div>
          <div className="table-header-cell">OMC / Bulk</div>
          <div className="table-header-cell">Nominal Cap</div>
          <div className="table-header-cell">Exp Date</div>
          <div className="table-header-cell">Operator</div>
          <div className="table-header-cell">Year</div>
          <div className="table-header-cell">Last Validation</div>
          <div className="table-header-cell text-right px-6 whitespace-nowrap">Laboratory Access</div>
          <div className="table-header-cell px-6">Unit Actions</div>
        </div>
        {loading ? <Loader /> : vehicles.map(v => (
          <div key={v.id} className="grid grid-cols-[1fr_0.8fr_0.8fr_1fr_1fr_0.8fr_1fr_auto_auto] hover:bg-bg-main transition-colors items-center border-b border-border/40 last:border-0 group">
            <div className="table-row-cell px-6 font-mono font-bold tracking-tight text-accent-blue">{v.registrationNumber}</div>
            <div className="table-row-cell">
               <div className="flex flex-col">
                 <span className="font-bold text-[10px] text-text-primary uppercase">{v.omc || 'N/A'}</span>
                 <span className="text-[9px] text-text-secondary">{v.bulkNumber || 'N/A'}</span>
               </div>
            </div>
            <div className="table-row-cell text-xs font-bold text-text-primary">
               {v.nominalCapacity || 'N/A'}
            </div>
            <div className="table-row-cell text-xs font-bold text-orange-600">
               {v.expirationDate ? new Date(v.expirationDate).toLocaleDateString() : 'N/A'}
            </div>
            <div className="table-row-cell">
              <div className="flex flex-col">
                <span className="font-bold text-xs truncate max-w-[120px]">{v.ownerName || 'UNASSIGNED'}</span>
                <span className="text-[9px] text-text-secondary truncate max-w-[120px]">{v.ownerEmail || 'No contact info'}</span>
              </div>
            </div>
            <div className="table-row-cell font-medium text-text-secondary">{v.year || 'N/A'}</div>
            <div className="table-row-cell text-text-secondary">
              {v.lastCalibrationDate ? new Date(v.lastCalibrationDate).toLocaleDateString() : 'NO HISTORY'}
            </div>
            <div className="table-row-cell text-right px-6">
              <Link to={`/compare?vehicleId=${v.id}`} className="text-[11px] font-bold text-accent-blue hover:text-accent-blue-dark transition-colors uppercase tracking-wider">
                Begin Calibration
              </Link>
            </div>
            <div className="table-row-cell px-6 flex items-center gap-2">
              <button 
                onClick={() => handleEdit(v)}
                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-accent-blue transition-colors"
                title="Edit Unit Details"
              >
                <Edit2 size={14} />
              </button>
              {user.role === 'admin' && (
                <button 
                  onClick={() => handleDelete(v)}
                  className={`flex items-center gap-1 p-1.5 rounded-lg transition-all duration-200 ${
                    confirmingId === v.id 
                    ? "bg-red-600 text-white px-3 text-[10px] font-bold" 
                    : "hover:bg-red-50 text-slate-400 hover:text-red-500"
                  }`}
                  title={confirmingId === v.id ? "Click again to confirm" : "Decommission Unit"}
                >
                  {confirmingId === v.id ? (
                    <>
                      <AlertCircle size={14} />
                      <span>Confirm?</span>
                    </>
                  ) : (
                    <Trash2 size={14} />
                  )}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <OnboardModal 
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingVehicle(null);
        }}
        onSuccess={fetchVehicles}
        vehicle={editingVehicle}
      />
    </div>
  );
};

const BulkTankCalibrationForm = ({ vehicleId, vehicles, onVehicleChange }: { vehicleId: number | null, vehicles: Vehicle[], onVehicleChange: (id: number) => void }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    certNumber: `TC-${Date.now().toString().slice(-6)}`,
    calibrationDate: new Date().toISOString().split('T')[0],
    location: '',
    station: '',
    tankCalibrated: '',
    tankPosition: '',
    medium: 'Water/Diesel',
    nominalCapacity: '',
    calibratedCapacity: '',
    method: 'Volumetric',
    flowRate: '',
    pressure: '',
    meterSerial: '',
    meterModel: '',
    mfgYear: '',
    issuedDate: new Date().toISOString().split('T')[0],
    expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    hatches: Array(9).fill(''),
    couplingFore: '',
    couplingAft: '',
    bulkNo: '',
  });
  
  const [compartments, setCompartments] = useState<any[]>(
    Array.from({ length: 9 }, (_, i) => ({
      label: `Compartment No. ${i + 1}`, 
      capacity: '9000', 
      height: '', 
      points: [
        { capacity: '9100', mileage: '' },
        { capacity: '9000', mileage: '' },
        { capacity: '8900', mileage: '' },
        { capacity: '8800', mileage: '' },
        { capacity: '8700', mileage: '' },
        { capacity: '8600', mileage: '' }
      ] 
    }))
  );
  const [submitting, setSubmitting] = useState(false);

  const selectedVehicle = vehicles.find(v => v.id === vehicleId);

  const addCompartment = () => {
    setCompartments([...compartments, { 
      label: `Compartment No. ${compartments.length + 1}`, 
      capacity: '', 
      height: '', 
      points: [{ capacity: '', mileage: '' }] 
    }]);
  };

  const removeCompartment = (idx: number) => {
    setCompartments(compartments.filter((_, i) => i !== idx));
  };

  const updateCompartment = (idx: number, data: any) => {
    const newComps = [...compartments];
    newComps[idx] = { ...newComps[idx], ...data };
    setCompartments(newComps);
  };

  const addPoint = (compIdx: number) => {
    const newComps = [...compartments];
    newComps[compIdx].points.push({ capacity: '', mileage: '' });
    setCompartments(newComps);
  };

  const removePoint = (compIdx: number, pointIdx: number) => {
    const newComps = [...compartments];
    newComps[compIdx].points = newComps[compIdx].points.filter((_: any, i: number) => i !== pointIdx);
    setCompartments(newComps);
  };

  const updatePoint = (compIdx: number, pointIdx: number, field: string, value: string) => {
    const newComps = [...compartments];
    newComps[compIdx].points[pointIdx][field] = value;
    setCompartments(newComps);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId) return;
    setSubmitting(true);
    try {
      const report = await apiRequest('/compare', {
        method: 'POST',
        body: JSON.stringify({ 
          vehicleId, 
          type: 'tank',
          ...formData,
          compartments 
        })
      });
      navigate(`/reports/${report.id}`);
    } catch (err) {
      alert(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="card space-y-8 bg-white border-2 border-accent-blue/10">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xl font-bold text-text-primary mb-1">Volumetric Tank Calibration Protocol</h3>
            <p className="text-text-secondary text-xs font-medium">Comprehensive metrological analysis for stationary and mobile storage units.</p>
          </div>
          <button 
            type="button"
            onClick={addCompartment}
            className="btn-primary !bg-accent-blue/10 !text-accent-blue !border-accent-blue/20 hover:!bg-accent-blue/20 flex items-center gap-2"
          >
            <Plus size={16} />
            <span>Add Compartment</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-10">
          {/* Header Info Section */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 bg-slate-50/50 rounded-2xl border border-slate-100">
            <div className="md:col-span-2">
              <label className="info-label">Active Calibration Unit</label>
              <select 
                className="w-full bg-white border border-slate-200 p-2.5 rounded-lg font-bold text-sm outline-none text-accent-blue shadow-sm"
                value={vehicleId || ''}
                onChange={e => onVehicleChange(parseInt(e.target.value))}
                required
              >
                <option value="">Select unit from library...</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.registrationNumber} - {v.omc || 'N/A'}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="info-label">Cert Number</label>
              <input 
                type="text" 
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold"
                value={formData.certNumber}
                onChange={e => setFormData({...formData, certNumber: e.target.value})}
                placeholder="EX: PC-93821"
              />
            </div>

            <div>
              <label className="info-label">Calibration Date</label>
              <input 
                type="date" 
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                value={formData.calibrationDate}
                onChange={e => setFormData({...formData, calibrationDate: e.target.value})}
              />
            </div>

            <div>
              <label className="info-label">Station</label>
              <input 
                type="text" 
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                placeholder="EX: Airport Site B"
                value={formData.station}
                onChange={e => setFormData({...formData, station: e.target.value})}
              />
            </div>

            <div>
              <label className="info-label">Location</label>
              <input 
                type="text" 
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                placeholder="EX: Tema Industrial Area"
                value={formData.location}
                onChange={e => setFormData({...formData, location: e.target.value})}
              />
            </div>

            <div>
              <label className="info-label">Tank Calibrated</label>
              <input 
                type="text" 
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                placeholder="EX: Tank 01"
                value={formData.tankCalibrated}
                onChange={e => setFormData({...formData, tankCalibrated: e.target.value})}
              />
            </div>

            <div>
              <label className="info-label">Tank Position</label>
              <input 
                type="text" 
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                placeholder="EX: Underground East"
                value={formData.tankPosition}
                onChange={e => setFormData({...formData, tankPosition: e.target.value})}
              />
            </div>

            <div>
              <label className="info-label">Medium</label>
              <input 
                type="text" 
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                value={formData.medium}
                onChange={e => setFormData({...formData, medium: e.target.value})}
              />
            </div>

            <div>
              <label className="info-label">Nominal Cap.</label>
              <input 
                type="text" 
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                value={formData.nominalCapacity}
                onChange={e => setFormData({...formData, nominalCapacity: e.target.value})}
              />
            </div>

            <div>
              <label className="info-label">Calibrated Cap.</label>
              <input 
                type="text" 
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                value={formData.calibratedCapacity}
                onChange={e => setFormData({...formData, calibratedCapacity: e.target.value})}
              />
            </div>

            <div>
              <label className="info-label">Method</label>
              <input 
                type="text" 
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                value={formData.method}
                onChange={e => setFormData({...formData, method: e.target.value})}
              />
            </div>

            <div>
              <label className="info-label">Flow Rate</label>
              <input 
                type="text" 
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                value={formData.flowRate}
                onChange={e => setFormData({...formData, flowRate: e.target.value})}
              />
            </div>

            <div>
              <label className="info-label">Pressure</label>
              <input 
                type="text" 
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                value={formData.pressure}
                onChange={e => setFormData({...formData, pressure: e.target.value})}
              />
            </div>

            <div>
              <label className="info-label">Meter Serial #</label>
              <input 
                type="text" 
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                value={formData.meterSerial}
                onChange={e => setFormData({...formData, meterSerial: e.target.value})}
              />
            </div>

            <div>
              <label className="info-label">Bulk Number</label>
              <input 
                type="text" 
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                value={formData.bulkNo}
                onChange={e => setFormData({...formData, bulkNo: e.target.value})}
              />
            </div>

            <div>
              <label className="info-label">Coupling (Fore)</label>
              <input 
                type="text" 
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                value={formData.couplingFore}
                onChange={e => setFormData({...formData, couplingFore: e.target.value})}
              />
            </div>

            <div>
              <label className="info-label">Coupling (Aft)</label>
              <input 
                type="text" 
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                value={formData.couplingAft}
                onChange={e => setFormData({...formData, couplingAft: e.target.value})}
              />
            </div>

            <div>
              <label className="info-label">Mfg Year</label>
              <input 
                type="text" 
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                value={formData.mfgYear}
                onChange={e => setFormData({...formData, mfgYear: e.target.value})}
              />
            </div>

            <div>
              <label className="info-label">Issued Date</label>
              <input 
                type="date" 
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                value={formData.issuedDate}
                onChange={e => setFormData({...formData, issuedDate: e.target.value})}
              />
            </div>

            <div>
              <label className="info-label">Expiry Date</label>
              <input 
                type="date" 
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                value={formData.expiryDate}
                onChange={e => setFormData({...formData, expiryDate: e.target.value})}
              />
            </div>
          </div>

          {/* Hatch Matrix */}
          <div className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100">
            <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 px-2">Ventilation & Hatch Matrix (H1-H9)</h5>
            <div className="grid grid-cols-3 md:grid-cols-9 gap-4">
              {formData.hatches.map((hatch, i) => (
                <div key={i}>
                  <label className="text-[9px] font-bold text-slate-400 mb-1 block uppercase">Hatch {i + 1}</label>
                  <input 
                    type="text" 
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-center outline-none focus:border-accent-blue"
                    value={hatch}
                    onChange={e => {
                      const newHatches = [...formData.hatches];
                      newHatches[i] = e.target.value;
                      setFormData({...formData, hatches: newHatches});
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-12">
            {compartments.map((comp, compIdx) => (
              <div key={compIdx} className="relative p-6 bg-white border border-border rounded-2xl shadow-sm hover:shadow-md transition-shadow group">
                <button 
                  type="button" 
                  onClick={() => removeCompartment(compIdx)}
                  className="absolute -top-3 -right-3 p-1.5 bg-red-50 text-red-500 rounded-full border border-red-100 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={14} />
                </button>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div>
                    <label className="info-label">Compartment Identifier</label>
                    <input 
                      type="text" 
                      className="w-full p-3 bg-bg-main border border-border rounded-lg text-sm font-bold"
                      value={comp.label}
                      onChange={e => updateCompartment(compIdx, { label: e.target.value })}
                      placeholder="EX: Compartment No. 1"
                    />
                  </div>
                  <div>
                    <label className="info-label">Nominal Capacity (Litres)</label>
                    <input 
                      type="text" 
                      className="w-full p-3 bg-bg-main border border-border rounded-lg text-sm font-bold"
                      value={comp.capacity}
                      onChange={e => updateCompartment(compIdx, { capacity: e.target.value })}
                      placeholder="EX: 9000 Litres"
                    />
                  </div>
                  <div>
                    <label className="info-label">Overall Height (cm)</label>
                    <input 
                      type="text" 
                      className="w-full p-3 bg-bg-main border border-border rounded-lg text-sm font-bold"
                      value={comp.height}
                      onChange={e => updateCompartment(compIdx, { height: e.target.value })}
                      placeholder="EX: 189.6 cm"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h5 className="text-[10px] font-black uppercase tracking-widest text-text-secondary">Calibration Point Matrix</h5>
                    <button 
                      type="button" 
                      onClick={() => addPoint(compIdx)}
                      className="text-[10px] font-bold text-accent-blue flex items-center gap-1 hover:underline"
                    >
                      <Plus size={12} /> Add Point
                    </button>
                  </div>

                  <div className="overflow-hidden border border-border rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-bg-main border-b border-border">
                        <tr>
                          <th className="p-3 font-bold uppercase tracking-wider text-text-secondary">Capacity (L)</th>
                          <th className="p-3 font-bold uppercase tracking-wider text-text-secondary">Mileage (km)</th>
                          <th className="p-3 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {comp.points.map((point: any, pIdx: number) => (
                          <tr key={pIdx} className="hover:bg-bg-main/20">
                            <td className="p-2">
                              <input 
                                type="text"
                                className="w-full p-2 bg-transparent outline-none font-mono font-bold"
                                placeholder="..."
                                value={point.capacity}
                                onChange={e => updatePoint(compIdx, pIdx, 'capacity', e.target.value)}
                              />
                            </td>
                            <td className="p-2">
                              <input 
                                type="text"
                                className="w-full p-2 bg-transparent outline-none font-mono font-bold text-accent-blue"
                                placeholder="..."
                                value={point.mileage}
                                onChange={e => updatePoint(compIdx, pIdx, 'mileage', e.target.value)}
                              />
                            </td>
                            <td className="p-2 text-right">
                              <button 
                                type="button" 
                                onClick={() => removePoint(compIdx, pIdx)}
                                className="p-1 text-text-secondary hover:text-red-500"
                              >
                                <X size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-8 border-t border-border flex justify-end">
            <button 
              type="submit" 
              disabled={submitting || !vehicleId}
              className="btn-primary px-16 h-14 flex items-center gap-3 text-sm shadow-lg shadow-accent-blue/20"
            >
              {submitting ? 'Authenticating Analysis...' : (
                <>
                  <ShieldCheck size={20} />
                  <span>Submit Calibration Protocol</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const PressureCalibrationForm = ({ vehicleId, vehicles, onVehicleChange }: { vehicleId: number | null, vehicles: Vehicle[], onVehicleChange: (id: number) => void }) => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    bulkSize: '',
    bulkDescription: '',
    compartment: '',
    recommendedVolumeChange: '',
    duration: '',
    monitoring: '',
    transporter: '',
    omc: ''
  });

  const selectedVehicle = vehicles.find(v => v.id === vehicleId);

  useEffect(() => {
    if (selectedVehicle) {
      setFormData(prev => ({
        ...prev,
        omc: selectedVehicle.omc || '',
        transporter: selectedVehicle.ownerName || ''
      }));
    }
  }, [selectedVehicle]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId) return;
    setSubmitting(true);
    try {
      const report = await apiRequest('/compare', {
        method: 'POST',
        body: JSON.stringify({ 
          vehicleId, 
          type: 'pressure',
          ...formData
        })
      });
      navigate(`/reports/${report.id}`);
    } catch (err) {
      alert(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="card space-y-8 bg-white border-2 border-slate-200">
        <div>
          <h3 className="text-xl font-bold text-slate-900 mb-1">Pressure Testing Protocol</h3>
          <p className="text-slate-500 text-xs font-medium">Hydrostatic pressure and structural integrity evaluation.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <label className="info-label">Certificate Number</label>
              <div className="text-sm font-mono font-bold text-slate-400">PC-{Date.now().toString().slice(-8)} (Auto)</div>
            </div>
            
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <label className="info-label">Active Calibration Unit</label>
              <select 
                className="w-full bg-transparent font-bold text-sm outline-none cursor-pointer text-accent-blue"
                value={vehicleId || ''}
                onChange={e => onVehicleChange(parseInt(e.target.value))}
                required
              >
                <option value="">Select unit...</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.registrationNumber}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
                <label className="info-label">OMC</label>
                <input 
                  type="text" 
                  className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm font-bold"
                  value={formData.omc}
                  onChange={e => setFormData({...formData, omc: e.target.value})}
                  placeholder="EX: GOODNESS"
                />
             </div>

             <div>
                <label className="info-label">Transporter</label>
                <input 
                  type="text" 
                  className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm font-bold"
                  value={formData.transporter}
                  onChange={e => setFormData({...formData, transporter: e.target.value})}
                  placeholder="EX: GOODNESS"
                />
             </div>

             <div>
                <label className="info-label">Bulk Vessel Size (L)</label>
                <input 
                  type="text" 
                  className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm font-bold"
                  value={formData.bulkSize}
                  onChange={e => setFormData({...formData, bulkSize: e.target.value})}
                  placeholder="EX: 54000 LTS"
                  required
                />
             </div>

             <div>
                <label className="info-label">Bulk Description</label>
                <input 
                  type="text" 
                  className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm font-bold"
                  value={formData.bulkDescription}
                  onChange={e => setFormData({...formData, bulkDescription: e.target.value})}
                  placeholder="EX: OVAL"
                  required
                />
             </div>

             <div>
                <label className="info-label">Compartment Count</label>
                <input 
                  type="text" 
                  className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm font-bold"
                  value={formData.compartment}
                  onChange={e => setFormData({...formData, compartment: e.target.value})}
                  placeholder="EX: 6"
                  required
                />
             </div>

             <div>
                <label className="info-label">Recommended Net Vol. Change</label>
                <input 
                  type="text" 
                  className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm font-bold"
                  value={formData.recommendedVolumeChange}
                  onChange={e => setFormData({...formData, recommendedVolumeChange: e.target.value})}
                  placeholder="EX: 1.5 BAR"
                  required
                />
             </div>

             <div>
                <label className="info-label">Test Duration</label>
                <input 
                  type="text" 
                  className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm font-bold"
                  value={formData.duration}
                  onChange={e => setFormData({...formData, duration: e.target.value})}
                  placeholder="EX: 1 HR"
                  required
                />
             </div>

             <div>
                <label className="info-label">Monitoring System</label>
                <input 
                  type="text" 
                  className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm font-bold"
                  value={formData.monitoring}
                  onChange={e => setFormData({...formData, monitoring: e.target.value})}
                  placeholder="EX: 30 MINS"
                  required
                />
             </div>
          </div>

          <div className="pt-8 border-t border-slate-100 flex justify-end">
            <button 
              type="submit" 
              disabled={submitting || !vehicleId}
              className="btn-primary px-16 h-14 flex items-center gap-3 text-sm"
            >
              {submitting ? 'Generating Certificate...' : (
                <>
                  <ShieldCheck size={20} />
                  <span>Finalize Pressure Test</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ComparePage = () => {
  const [searchParams] = useSearchParams();
  const vehicleIdFromUrl = searchParams.get('vehicleId');
  const filter = searchParams.get('filter');
  const navigate = useNavigate();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(vehicleIdFromUrl ? parseInt(vehicleIdFromUrl) : null);

  useEffect(() => {
    apiRequest('/vehicles').then(setVehicles);
  }, []);

  if (filter === 'pressure') {
    return <PressureCalibrationForm vehicleId={selectedVehicleId} vehicles={vehicles} onVehicleChange={setSelectedVehicleId} />;
  }

  // Tank Calibration Logic
  return <BulkTankCalibrationForm vehicleId={selectedVehicleId} vehicles={vehicles} onVehicleChange={setSelectedVehicleId} />;
}

const ReportsPage = ({ user }: { user: User }) => {
  const [reports, setReports] = useState<CalibrationReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);

  useEffect(() => {
    apiRequest('/reports').then(setReports).finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: number) => {
    if (confirmingId !== id) {
      setConfirmingId(id);
      setTimeout(() => setConfirmingId(null), 3000);
      return;
    }

    console.log(`[LAB] Initiate record purge for report ID: ${id}`);
    setLoading(true);
    try {
      await apiRequest(`/reports/${id}`, { method: 'DELETE' });
      console.log(`[LAB] Successfully purged report ID: ${id}`);
      setConfirmingId(null);
      const data = await apiRequest('/reports');
      setReports(data);
    } catch (err: any) {
      console.error(`[LAB] Record purge failure for report ID ${id}:`, err);
      alert(err.message);
      setConfirmingId(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="bg-white border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="grid grid-cols-[1fr_1fr_1fr_0.8fr_1.5fr_1fr_auto] bg-[#f8fafc] border-b border-border">
          <div className="table-header-cell">Laboratory Key</div>
          <div className="table-header-cell">Unit (Reg No)</div>
          <div className="table-header-cell">Operator</div>
          <div className="table-header-cell">Status</div>
          <div className="table-header-cell">Summary</div>
          <div className="table-header-cell">Laboratory File</div>
          <div className="table-header-cell px-6 text-right">Actions</div>
        </div>
        {loading ? <Loader /> : reports.map(r => (
          <div key={r.id} className="grid grid-cols-[1fr_1fr_1fr_0.8fr_1.5fr_1fr_auto] hover:bg-bg-main transition-colors items-center border-b border-border last:border-0">
            <div className="table-row-cell font-mono text-[10px] font-bold text-text-secondary">
              {new Date(r.createdAt).toLocaleDateString()}
            </div>
            <div className="table-row-cell font-bold text-accent-blue font-mono">{r.vehicle?.registrationNumber || 'N/A'}</div>
            <div className="table-row-cell font-medium">{r.technician?.name || 'Unknown Operator'}</div>
            <div className="table-row-cell">
              <span className={cn(
                "status-chip",
                r.status === 'approved' ? "pass" :
                r.status === 'rejected' ? "fail" :
                "pending"
              )}>
                {r.status}
              </span>
            </div>
            <div className="table-row-cell text-xs font-semibold text-text-secondary truncate">
              {JSON.parse(r.reportDataJson as any).overallStatus}
            </div>
            <div className="table-row-cell">
              <Link to={`/reports/${r.id}`} className="text-xs font-bold text-accent-blue hover:underline uppercase tracking-wider flex items-center gap-1">
                View Report
              </Link>
            </div>
            <div className="table-row-cell px-6 text-right">
              {user.role === 'admin' && (
                <button 
                  onClick={() => handleDelete(r.id)}
                  className={`flex items-center gap-1 p-1.5 rounded-lg transition-all duration-200 ml-auto ${
                    confirmingId === r.id 
                    ? "bg-red-600 text-white px-3 text-[10px] font-bold" 
                    : "hover:bg-red-50 text-slate-400 hover:text-red-500"
                  }`}
                  title={confirmingId === r.id ? "Click again to confirm" : "Purge Record"}
                >
                  {confirmingId === r.id ? (
                    <>
                      <AlertCircle size={14} />
                      <span>Confirm?</span>
                    </>
                  ) : (
                    <Trash2 size={14} />
                  )}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ReportDetailPage = ({ user }: { user: User }) => {
  const { id } = useParams();
  const [logos, setLogos] = useState<Record<string, string>>({});
  const [report, setReport] = useState<CalibrationReport | null>(null);
  const [adminComment, setAdminComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const navigate = useNavigate();

  const fetchReport = () => {
    apiRequest(`/reports/${id}`).then(setReport).finally(() => setLoading(false));
  };

  const fetchLogos = () => {
    apiRequest('/settings/logos').then(setLogos);
  };

  useEffect(() => {
    fetchReport();
    fetchLogos();
  }, [id]);

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      await apiRequest(`/reports/${id}/approve`, {
        method: 'PUT',
        body: JSON.stringify({ comment: adminComment })
      });
      fetchReport();
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    setActionLoading(true);
    try {
      await apiRequest(`/reports/${id}/reject`, {
        method: 'PUT',
        body: JSON.stringify({ comment: adminComment })
      });
      fetchReport();
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadCertificate = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Authentication required for download.');

      const response = await fetch(`/api/certificates/${report.id}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          // If auth failed, trigger the global auth-failure event
          window.dispatchEvent(new Event('auth-failure'));
          throw new Error('Your session has expired. Please log in again.');
        }
        
        // Attempt to parse JSON error even though we expect a blob
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Download failed (HTTP ${response.status})`);
      }
      
      const blob = await response.blob();
      
      // Basic check if we got a PDF (and not JSON error masquerading as blob)
      if (blob.type !== 'application/pdf') {
        const text = await blob.text();
        try {
          const json = JSON.parse(text);
          throw new Error(json.error || 'Server returned invalid data format instead of PDF.');
        } catch (e) {
          throw new Error('Received unexpected content from server. Please try again.');
        }
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificate_${report?.certificate?.certificateNumber || report.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 100);
    } catch (err: any) {
      console.error('[DOWNLOAD_ERROR]', err);
      alert(`Export Failure: ${err.message}`);
    }
  };

  const handleDelete = async () => {
    if (!isConfirmingDelete) {
      setIsConfirmingDelete(true);
      setTimeout(() => setIsConfirmingDelete(false), 3000);
      return;
    }

    setActionLoading(true);
    try {
      await apiRequest(`/reports/${id}`, { method: 'DELETE' });
      navigate('/reports');
    } catch (err: any) {
      console.error(`[LAB] Record purge failure for report ID ${id}:`, err);
      alert(err.message || 'System rejection: Failed to purge record.');
      setIsConfirmingDelete(false);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !report) return <Loader />;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <header className="flex justify-between items-center">
        <div className="text-sm text-text-secondary font-medium">System / Reports / <span className="text-text-primary font-bold">REF-{report.id}</span></div>
        <div className="flex items-center gap-3">
          <span className="badge-role bg-[#dbeafe] text-[#1e40af] px-3 py-1 rounded text-[10px] font-bold tracking-wider">
            {report.status.toUpperCase()}
          </span>
          {report.status === 'approved' && report.certificate && (
            <button 
              onClick={handleDownloadCertificate}
              className="btn-primary flex items-center gap-2 bg-green-600 !text-white cursor-pointer"
            >
              <Download size={16} />
              Export Certificate
            </button>
          )}
          {user.role === 'admin' && (
            <button 
              onClick={handleDelete}
              disabled={actionLoading}
              className={`p-3 rounded-xl transition-all duration-300 border ${
                isConfirmingDelete 
                ? "bg-red-600 text-white border-red-600 shadow-lg shadow-red-200 animate-pulse" 
                : "bg-red-50 text-red-600 hover:bg-red-100 border-red-100"
              }`}
              title={isConfirmingDelete ? "Click again to confirm purge" : "Purge Report"}
            >
              {isConfirmingDelete ? (
                <div className="flex items-center gap-2 px-1">
                  <AlertCircle size={18} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Confirm Purge</span>
                </div>
              ) : (
                <Trash2 size={20} />
              )}
            </button>
          )}
        </div>
      </header>

      <section className="card grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="info-group">
          <label className="info-label">Reg Number</label>
          <span className="info-value font-mono">{report.vehicle?.registrationNumber || 'N/A'}</span>
        </div>
        <div className="info-group">
          <label className="info-label">OMC / Bulk</label>
          <span className="info-value text-xs">{report.vehicle?.omc || 'N/A'} / {report.vehicle?.bulkNumber || 'N/A'}</span>
        </div>
        <div className="info-group">
          <label className="info-label">Nominal Capacity</label>
          <span className="info-value font-bold text-accent-blue">{report.vehicle?.nominalCapacity || 'N/A'}</span>
        </div>
        <div className="info-group">
          <label className="info-label">Lead Technician</label>
          <span className="info-value">{report.technician?.name || 'Unknown Operator'}</span>
        </div>
        <div className="info-group">
          <label className="info-label">Report Date</label>
          <span className="info-value">{new Date(report.createdAt).toLocaleString()}</span>
        </div>
      </section>

      <section className="space-y-8">
        {report.reportData.type === 'pressure' ? (
          <div className="space-y-12">
            <div className="bg-white border text-slate-900 rounded-lg overflow-hidden shadow-2xl shadow-slate-200 relative">
              {/* Background Watermark */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.04] select-none z-0">
                <span className="text-[280px] font-black tracking-tighter">NPA</span>
              </div>

              <div className="p-8 space-y-4 relative z-10">
                <div className="space-y-3">
                  <div className="grid grid-cols-3 items-center gap-4">
                    {/* Left: GSA */}
                    <div className="flex justify-start">
                      <div className="w-[60px] h-[60px] rounded-xl flex items-center justify-center overflow-hidden">
                        {logos.logo_gsa ? (
                          <img src={logos.logo_gsa} alt="GSA" className="w-full h-full object-contain" />
                        ) : (
                          <div className="w-full h-full bg-[#6366f1] p-1.5 flex flex-col items-center justify-center text-white">
                            <div className="flex gap-1 mb-1">
                              <div className="w-2 h-4 border-2 border-white/90 rounded-sm" />
                              <div className="w-2 h-4 border-2 border-white/90 rounded-sm" />
                              <div className="w-2 h-4 border-2 border-white/90 rounded-sm" />
                            </div>
                            <span className="text-[12px] font-black tracking-widest leading-none">GSA</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Center: ELI */}
                    <div className="flex flex-col items-center">
                      <div className="w-[70px] h-[70px] rounded-full flex items-center justify-center p-1 bg-white shadow-sm overflow-hidden mb-1">
                        {logos.logo_elle ? (
                          <img src={logos.logo_elle} alt="ELI" className="w-full h-full object-contain" />
                        ) : (
                          <div className="flex flex-col items-center">
                            <div className="bg-red-600 text-white font-black text-[10px] px-2 py-0.5 italic rounded leading-none mb-0.5">ELI</div>
                            <p className="text-[5px] font-black uppercase text-center leading-tight">Eli Company<br/>Limited</p>
                          </div>
                        )}
                      </div>
                      <h2 className="text-[11px] font-black text-slate-900 tracking-tighter uppercase whitespace-nowrap">Eli Company Limited</h2>
                    </div>

                    {/* Right: NPA & Cert No */}
                    <div className="flex flex-col items-end gap-2">
                       <div className="flex items-center gap-2">
                        <div className="flex flex-col items-end">
                          <span className="text-[24px] font-black text-[#1e40af] italic leading-none">NPA</span>
                          <span className="text-[5px] font-black uppercase text-amber-600 leading-none">National Petroleum Authority</span>
                        </div>
                        <div className="w-[55px] h-[55px] rounded-full bg-white overflow-hidden shadow-sm ring-1 ring-slate-100 flex items-center justify-center">
                          {logos.logo_npa ? (
                            <img src={logos.logo_npa} alt="NPA" className="w-full h-full object-contain" />
                          ) : (
                            <div className="w-full h-full rounded-full border-[4px] border-amber-500 flex items-center justify-center">
                              <div className="w-4 h-4 bg-[#1e40af] rounded-full ring-2 ring-white" />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col w-36 overflow-hidden rounded border border-[#1e40af] text-center">
                        <div className="bg-[#1e40af] py-0.5 px-2">
                          <span className="text-[8px] font-black uppercase text-white tracking-widest">Cert No.</span>
                        </div>
                        <div className="bg-white py-1 px-2">
                          <span className="text-[14px] font-black text-slate-900 font-mono">
                            {report.certificate?.certificateNumber || 'ELI/003'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-center pt-1 border-t border-slate-300 border-dashed">
                    <p className="text-[7px] font-black text-slate-900 tracking-tight">P.O. BOX OS, 1451, OSU, ACCRA - GHANA | TEL: +233 (0) 50 162 0022 / +233 (0) 50 160 3918</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="relative">
                    <h3 className="text-xl font-black text-center tracking-[0.2em] text-slate-900 uppercase">PRESSURE TESTING CERTIFICATE</h3>
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 text-[9px] font-bold text-blue-600 underline">www.elivcsgh.com</div>
                  </div>

                  {/* Field Grid - Matching visual order of image */}
                  <div className="grid grid-cols-[1.5fr_2fr] gap-x-12 gap-y-1.5 pt-2">
                    {[
                      { label: "CERTIFICATE NO. :", value: report.reportData.bulkNo || 'ELI/TM/GO/GO / 1693' },
                      { label: "VEHICLE NO:", value: report.vehicle.registrationNumber || 'GT 8835 - 20' },
                      { label: "spacer", spacer: true },
                      { label: "OMC:", value: report.reportData.omc || report.vehicle.omc || 'GOODNESS' },
                      { label: "Transporter:", value: report.reportData.transporter || report.vehicle.ownerName || 'GOODNESS' },
                      { label: "spacer", spacer: true },
                      { label: "Bulk Size :", value: `${report.reportData.bulkSize || '54,000'} LTS` },
                      { label: "Bulk Description :", value: report.reportData.bulkDescription || 'Oval' },
                      { label: "Compartment :", value: report.reportData.compartment || '6' },
                      { label: "spacer", spacer: true },
                      { label: "Recommended Net Volume Change :", value: report.reportData.recommendedVolumeChange || '1. 5bar' },
                      { label: "Duration For Testing :", value: report.reportData.duration || '1 Hr' },
                      { label: "Monitoring :", value: report.reportData.monitoring || '30 mins' },
                    ].map((item, idx) => (
                      item.spacer ? (
                        <div key={idx} className="col-span-2 h-1" />
                      ) : (
                      <React.Fragment key={idx}>
                        <div className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{item.label}</div>
                        <div className="text-[10px] font-black text-slate-900 uppercase">{item.value}</div>
                      </React.Fragment>
                      )
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <p className="text-[10px] font-bold text-slate-900 leading-tight">
                    This is to Certify that a Tank tightness test conducted at (please see above) passed the<br />
                    test using third party certified method-HYDRO TEST *Tank Testing System which is valid for the tank size and content,<br />
                    and which was conducted for the proper duration and under testing.
                  </p>
                </div>

                <div className="flex justify-between items-end pt-4">
                  <div className="space-y-1.5">
                    <div className="flex gap-4">
                      <span className="text-[10px] font-black text-slate-900 w-20">Date:</span>
                      <span className="text-[10px] font-black text-slate-900 uppercase">
                        {new Date(report.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex gap-4">
                      <span className="text-[10px] font-black text-slate-900 w-20">Expires on:</span>
                      <span className="text-[10px] font-black text-slate-900 uppercase">
                        {new Date(new Date(report.createdAt).setFullYear(new Date(report.createdAt).getFullYear() + 1)).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute bottom-8 right-2 w-28 h-28 border-4 border-dashed border-blue-800/30 rounded-full flex items-center justify-center -rotate-12 pointer-events-none">
                      <div className="text-center">
                        <p className="text-[7px] font-black text-blue-800 uppercase leading-none">HEAD OF OPERATIONS</p>
                        <p className="text-[7px] font-black text-blue-800 uppercase leading-none">ELI CO. LTD</p>
                        <p className="text-[9px] font-black text-blue-800 uppercase mt-1">MAY 2026</p>
                        <p className="text-[7px] font-black text-blue-800 uppercase leading-none mt-1">CALIBRATION DEPT</p>
                      </div>
                    </div>
                    <div className="text-center pt-8">
                      <div className="w-40 h-[1.5px] bg-slate-900" />
                      <p className="text-[10px] font-black text-slate-900 uppercase mt-1">Operations Manager.</p>
                    </div>
                  </div>
                </div>

                <div className="-mx-8 -mb-8 mt-12 relative">
                  <div className="px-8 text-[9px] font-bold text-slate-500 mb-3 text-center uppercase tracking-tight">
                    This Certificate Shall Not Be Reproduced in Part Or Full Except With Permission From The Issuing Authority
                  </div>
                  <div className="bg-[#1a1b41] text-white py-3 px-8 flex justify-between items-center">
                    <div className="flex items-center gap-1.5">
                      <span className="bg-red-600 px-1.5 py-0.5 rounded-sm text-[8px] font-black">KEEP</span>
                      <span className="text-[8px] font-black tracking-widest uppercase">This Certificate Safely</span>
                    </div>
                    <div className="text-[8px] font-black tracking-widest uppercase opacity-80">
                      Tank Cleaning, Pressure And Calibration Services
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : report.reportData.type === 'tank' ? (
          <div className="relative max-w-4xl mx-auto">
            {/* Authentic Vertical Side Marker */}
            <div className="absolute -right-8 top-1/2 -translate-y-1/2 [writing-mode:vertical-lr] rotate-180 flex items-center gap-4 group opacity-30 select-none pointer-events-none">
              <span className="text-[6px] font-black uppercase tracking-[0.5em] text-slate-900 border-l border-slate-900 pl-2">System Authentication Node Verified</span>
              <span className="text-[7px] font-mono font-bold text-slate-500">https://bcs.elivcsgh.com/sms/brvCertificate.php?id={report.id}</span>
            </div>

            <div className="bg-white border border-slate-200 shadow-2xl rounded-lg overflow-hidden text-slate-900">
              <div className="p-8 space-y-4">
                <div className="space-y-3">
                  <div className="grid grid-cols-3 items-center gap-4">
                    {/* Left: GSA */}
                    <div className="flex justify-start">
                      <div className="w-[60px] h-[60px] rounded-xl flex items-center justify-center overflow-hidden">
                        {logos.logo_gsa ? (
                          <img src={logos.logo_gsa} alt="GSA" className="w-full h-full object-contain" />
                        ) : (
                          <div className="w-full h-full bg-[#6366f1] p-1.5 flex flex-col items-center justify-center text-white">
                            <div className="flex gap-1 mb-1">
                              <div className="w-2 h-4 border-2 border-white/90 rounded-sm" />
                              <div className="w-2 h-4 border-2 border-white/90 rounded-sm" />
                              <div className="w-2 h-4 border-2 border-white/90 rounded-sm" />
                            </div>
                            <span className="text-[12px] font-black tracking-widest leading-none">GSA</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Center: ELI */}
                    <div className="flex flex-col items-center">
                      <div className="w-[70px] h-[70px] rounded-full flex items-center justify-center p-1 bg-white shadow-sm overflow-hidden mb-1">
                        {logos.logo_elle ? (
                          <img src={logos.logo_elle} alt="ELI" className="w-full h-full object-contain" />
                        ) : (
                          <div className="flex flex-col items-center">
                            <div className="bg-red-600 text-white font-black text-[10px] px-2 py-0.5 italic rounded leading-none mb-0.5">ELI</div>
                            <p className="text-[5px] font-black uppercase text-center leading-tight">Eli Company<br/>Limited</p>
                          </div>
                        )}
                      </div>
                      <h2 className="text-[11px] font-black text-slate-900 tracking-tighter uppercase whitespace-nowrap">Eli Company Limited</h2>
                    </div>

                    {/* Right: NPA & Cert No */}
                    <div className="flex flex-col items-end gap-2">
                       <div className="flex items-center gap-2">
                        <div className="flex flex-col items-end">
                          <span className="text-[24px] font-black text-[#1e40af] italic leading-none">NPA</span>
                          <span className="text-[5px] font-black uppercase text-amber-600 leading-none">National Petroleum Authority</span>
                        </div>
                        <div className="w-[55px] h-[55px] rounded-full bg-white overflow-hidden shadow-sm ring-1 ring-slate-100 flex items-center justify-center">
                          {logos.logo_npa ? (
                            <img src={logos.logo_npa} alt="NPA" className="w-full h-full object-contain" />
                          ) : (
                            <div className="w-full h-full rounded-full border-[4px] border-amber-500 flex items-center justify-center">
                              <div className="w-4 h-4 bg-[#1e40af] rounded-full ring-2 ring-white" />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col w-36 overflow-hidden rounded border border-[#1e40af] text-center">
                        <div className="bg-[#1e40af] py-0.5 px-2">
                          <span className="text-[8px] font-black uppercase text-white tracking-widest">Cert No.</span>
                        </div>
                        <div className="bg-white py-1 px-2">
                          <span className="text-[14px] font-black text-slate-900 font-mono">
                            {report.certificate?.certificateNumber || 'TC-285850'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-center pt-1 border-t border-slate-300 border-dashed">
                    <p className="text-[7px] font-black text-slate-900 tracking-tight">P.O. BOX OS, 1451, OSU, ACCRA - GHANA | TEL: +233 (0) 50 162 0022 / +233 (0) 50 160 3918</p>
                  </div>
                </div>

              <div className="text-center pt-2 space-y-1">
                <div className="space-y-0.5">
                  <h2 className="text-[9px] font-black tracking-[0.3em] text-slate-400">BULK ROAD VEHICLE</h2>
                  <h1 className="text-xl font-black uppercase tracking-[0.4em] text-slate-900 border-b border-slate-900 inline-block px-6 pb-0.5 mb-1">CALIBRATION CERTIFICATE</h1>
                </div>
                
                <div className="flex flex-col items-center">
                  <span className="text-[8px] font-black uppercase text-slate-500 tracking-[0.2em]">BULK NO.</span>
                  <div className="px-4 py-0.5 border-b border-slate-900">
                    <span className="text-xs font-black text-slate-900 uppercase italic">
                      {report.reportData.bulkNo || 'ELI/TM/BO/me/2331'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Authentic Vehicle Information Section */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 px-4 py-3 bg-slate-50/50 border-y border-slate-300">
                <div className="space-y-2">
                  <div className="flex justify-between items-end border-b border-slate-200 pb-0.5">
                    <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Vehicle Registration Number</span>
                    <span className="text-xs font-black text-slate-900">{report.vehicle.registrationNumber}</span>
                  </div>
                  <div className="flex justify-between items-end border-b border-slate-200 pb-0.5">
                    <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Expiry Date</span>
                    <span className="text-xs font-black text-slate-900">{new Date(report.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-end border-b border-slate-200 pb-0.5">
                    <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">OMC</span>
                    <span className="text-xs font-black text-slate-900">{report.vehicle.omc || 'BOST'}</span>
                  </div>
                  <div className="flex justify-between items-end border-b border-slate-200 pb-0.5">
                    <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Bulk No.</span>
                    <span className="text-[10px] font-black text-slate-900 italic">{report.reportData.bulkNo || 'ELI/TM/BO/me/2331'}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center px-4 font-black text-[9px]">
                <div>EXPIRY DATE: {new Date(report.reportData.expiryDate || report.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()}</div>
                <div>NOMINAL CAPACITY: {report.reportData.nominalCapacity || '54000'} LITRES</div>
              </div>

              {/* Compartments Grid */}
              <div className="grid grid-cols-3 gap-2">
                {(report.reportData.compartments || []).slice(0, 9).map((comp: any, idx: number) => (
                  <div key={idx} className="border border-slate-200 rounded overflow-hidden">
                    <div className="bg-slate-50 p-1.5 border-b border-slate-200">
                      <div className="flex justify-between items-center text-[6px] font-black text-slate-400 mb-0.5">
                        <span className="uppercase">{comp.label || `Compartment No. ${idx + 1}`}</span>
                        <span>Height: {comp.height || '226.3'} cm</span>
                      </div>
                      <p className="text-[8px] font-black text-slate-700">Capacity: {comp.capacity || '9000'} Litres</p>
                    </div>
                    <table className="w-full text-[7px]">
                      <thead className="bg-slate-100 text-slate-500 font-bold">
                        <tr className="border-b border-slate-200">
                          <th className="p-0.5 px-1 text-left border-r border-slate-200">CAPACITY (L)</th>
                          <th className="p-0.5 px-1 text-left">ULLAGE (cm)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 italic">
                        {(comp.points || []).slice(0, 6).map((p: any, i: number) => (
                          <tr key={i}>
                            <td className="p-0.5 px-1 border-r border-slate-200 font-bold">{p.capacity}</td>
                            <td className="p-0.5 px-1 font-bold">{p.mileage} {i === 1 ? '*' : ''}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>

              {/* Hatches */}
              <div className="grid grid-cols-9 border border-slate-200 text-center rounded bg-slate-50">
                {(report.reportData.hatches || Array(9).fill('')).map((h: string, i: number) => (
                  <div key={i} className="border-r last:border-r-0 border-slate-200 py-1">
                    <p className="text-[6px] font-black text-slate-400 uppercase mb-0.5">Hatch {i + 1}</p>
                    <p className="text-[10px] font-bold">{h || 'NA'}</p>
                  </div>
                ))}
              </div>

              {/* Footer Details */}
              <div className="flex justify-between items-end pt-4">
                <div className="space-y-1">
                   <p className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">COUPLING HEIGHT: FORE: {report.reportData.couplingFore || '155.5'} cm / AFT: {report.reportData.couplingAft || '141.0'} cm</p>
                   <p className="text-[8px] font-bold text-slate-400 italic leading-none">* ULLAGE AT WHICH THE NOMINAL CAPACITY IS SET</p>
                   <p className="text-[7px] font-black text-slate-900 border-t border-slate-100 pt-1 uppercase">CALIBRATION PERFORMED WITH BOTTOM LINES EMPTY</p>
                </div>
                <div className="text-center relative">
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-20 rotate-12">
                    <div className="w-16 h-16 rounded-full border-2 border-dashed border-red-500 flex items-center justify-center font-black text-[6px] text-red-500 text-center uppercase tracking-tighter p-1">Official Seal<br/>Calibration Dept</div>
                  </div>
                  <div className="w-40 h-px bg-slate-900 mb-2" />
                  <p className="text-[9px] font-black uppercase">Authorised Signature</p>
                  <p className="text-[8px] font-bold text-slate-400 uppercase">DATE: {new Date(report.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()}</p>
                </div>
              </div>

              <div className="-mx-8 -mb-8 mt-12 relative">
                <div className="px-8 text-[9px] font-bold text-slate-500 mb-3 text-center uppercase tracking-tight">
                  This Certificate Shall Not Be Reproduced in Part Or Full Except With Permission From The Issuing Authority
                </div>
                <div className="bg-[#1a1b41] text-white py-3 px-8 flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <span className="bg-red-600 px-1.5 py-0.5 rounded-sm text-[8px] font-black">KEEP</span>
                    <span className="text-[8px] font-black tracking-widest uppercase">This Certificate Safely</span>
                  </div>
                  <div className="text-[8px] font-black tracking-widest uppercase opacity-80">
                    Tank Cleaning, Pressure And Calibration Services
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
          <>
            {Object.entries(report.reportData.results.reduce((acc: any, res: any) => {
              const cat = res.category || 'General';
              if (!acc[cat]) acc[cat] = [];
              acc[cat].push(res);
              return acc;
            }, {})).map(([category, items]: [string, any]) => (
              <div key={category} className="card !p-0 overflow-hidden flex flex-col">
                <div className="bg-[#f8fafc] border-b border-border p-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-accent-blue">{category}</h4>
                </div>
                <div className="grid grid-cols-4 bg-[#f8fafc] border-b border-border">
                  <div className="table-header-cell text-[10px]">Parameter Name</div>
                  <div className="table-header-cell text-[10px]">Standard Window</div>
                  <div className="table-header-cell text-[10px]">Measured Value</div>
                  <div className="table-header-cell text-[10px] text-right">Verdict</div>
                </div>
                
                {items.map((res: any, idx: number) => (
                  <div key={idx} className="grid grid-cols-4 border-b border-border last:border-0 hover:bg-bg-main transition-colors">
                    <div className="table-row-cell font-semibold text-xs py-3">{res.name}</div>
                    <div className="table-row-cell font-mono text-[10px] text-text-secondary py-3">{res.range} {res.unit}</div>
                    <div className="table-row-cell font-mono font-bold text-xs py-3">{res.measured} {res.unit}</div>
                    <div className="table-row-cell text-right py-3 pr-4">
                      <span className={cn("status-chip", res.status === 'PASS' ? "pass" : "fail")}>
                        {res.status}ED
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </>
        )}
      </section>

      <section className="card flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex-1 w-full">
          <label className="info-label !mb-2">Admin Review Comments</label>
          {report.status === 'pending' && user.role === 'admin' ? (
            <textarea 
              className="w-full p-4 bg-bg-main border border-border rounded-xl focus:ring-2 focus:ring-accent-blue/10 outline-none text-sm font-medium h-24"
              placeholder="Enter validation feedback for technician..."
              value={adminComment}
              onChange={e => setAdminComment(e.target.value)}
            />
          ) : (
            <div className="p-4 bg-bg-main rounded-xl border border-border text-sm italic font-medium">
              {report.adminComment || 'No additional comments provided by supervisor.'}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 min-w-[320px]">
          <div className={cn(
            "flex items-center gap-3 p-4 rounded-xl border font-bold text-sm",
            report.reportData.overallStatus.includes('Passed') 
              ? "bg-[#ecfdf5] border-[#10b981]/20 text-[#065f46]" 
              : "bg-[#fffbeb] border-[#fde68a] text-[#92400e]"
          )}>
            <Clock size={18} />
            <span>Overall Status: {report.status.toUpperCase()}</span>
          </div>
          
          {user.role === 'admin' && report.status === 'pending' && (
            <div className="flex gap-3">
              <button 
                onClick={handleReject}
                disabled={actionLoading}
                className="btn-secondary flex-1"
              >
                Reject Report
              </button>
              <button 
                onClick={handleApprove}
                disabled={actionLoading}
                className="btn-primary flex-1 whitespace-nowrap"
              >
                Approve & Sign
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

const PressureCalibrationPage = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchVehicles = () => {
    setLoading(true);
    apiRequest('/vehicles').then(setVehicles).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <Navbar title="Vehicle Pressure Calibration" />
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} />
          <span>Onboard New Unit</span>
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Active Lab Pressure" value="101.3" unit="kPa" icon={<Gauge size={24} />} />
        <StatCard label="Ambient Temp" value="24.2" unit="°C" icon={<Clock size={24} />} accent />
        <StatCard label="Pending Certs" value="0" icon={<ClipboardCheck size={24} />} />
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold">Pneumatic Integrity Protocol</h3>
            <p className="text-xs text-text-secondary">Select a unit to initiate rigorous pressure stability analysis.</p>
          </div>
          <div className="px-3 py-1 bg-accent-blue/10 text-accent-blue text-[10px] font-bold uppercase tracking-wider rounded-full">
            17 System Parameters Available
          </div>
        </div>
        
        <div className="bg-[#f8fafc] border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="grid grid-cols-5 bg-white border-b border-border">
            <div className="table-header-cell">Reg Number</div>
            <div className="table-header-cell">OMC / Bulk</div>
            <div className="table-header-cell">Nominal Cap</div>
            <div className="table-header-cell">Exp Date</div>
            <div className="table-header-cell text-right">Initiate Sequence</div>
          </div>
          {loading ? <Loader /> : vehicles.map(v => (
            <div key={v.id} className="grid grid-cols-5 hover:bg-white transition-colors items-center">
              <div className="table-row-cell font-mono font-bold tracking-tight text-accent-blue">{v.registrationNumber}</div>
              <div className="table-row-cell font-semibold">{v.omc || 'N/A'} / {v.bulkNumber || 'N/A'}</div>
              <div className="table-row-cell font-bold text-accent-blue">{v.nominalCapacity || 'N/A'}</div>
              <div className="table-row-cell font-medium text-text-secondary">{v.expirationDate ? new Date(v.expirationDate).toLocaleDateString() : 'N/A'}</div>
              <div className="table-row-cell text-right">
                <Link 
                  to={`/compare?vehicleId=${v.id}&filter=pressure`} 
                  className="btn-primary !py-1.5 !px-4 text-[10px] uppercase tracking-widest inline-flex items-center gap-2"
                >
                  <Gauge size={12} />
                  Start Pressure Calibration
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      <OnboardModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchVehicles}
      />
    </div>
  );
};

const TankCalibrationPage = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchVehicles = () => {
    setLoading(true);
    apiRequest('/vehicles').then(setVehicles).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <Navbar title="Underground Tank Services" />
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center gap-2 bg-[#92400e] hover:bg-[#78350f] border-[#78350f]"
        >
          <Plus size={16} />
          <span>Onboard New Unit</span>
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="UST Fleet Count" value={vehicles.length.toString()} icon={<Droplets size={24} />} />
        <StatCard label="Avg Temp" value="18.5" unit="°C" icon={<Clock size={24} />} />
        <StatCard label="Compliance Rate" value="94" unit="%" icon={<ShieldCheck size={24} />} accent />
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold">UST Calibration & Maintenance Protocol</h3>
            <p className="text-xs text-text-secondary">Comprehensive leakage, contamination, and volume analysis for underground assets.</p>
          </div>
          <div className="px-3 py-1 bg-[#fef3c7] text-[#92400e] text-[10px] font-bold uppercase tracking-wider rounded-full border border-[#fde68a]">
            8 Specialized Service Categories
          </div>
        </div>
        
        <div className="bg-[#f8fafc] border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="grid grid-cols-5 bg-white border-b border-border">
            <div className="table-header-cell">Reg Number</div>
            <div className="table-header-cell">OMC / Bulk</div>
            <div className="table-header-cell">Nominal Cap</div>
            <div className="table-header-cell">Exp Date</div>
            <div className="table-header-cell text-right">Service Actions</div>
          </div>
          {loading ? <Loader /> : vehicles.map(v => (
            <div key={v.id} className="grid grid-cols-5 hover:bg-white transition-colors items-center">
              <div className="table-row-cell font-mono font-bold tracking-tight text-accent-blue">{v.registrationNumber}</div>
              <div className="table-row-cell font-semibold">{v.omc || 'N/A'} / {v.bulkNumber || 'N/A'}</div>
              <div className="table-row-cell font-bold text-accent-blue">{v.nominalCapacity || 'N/A'}</div>
              <div className="table-row-cell font-medium text-text-secondary">{v.expirationDate ? new Date(v.expirationDate).toLocaleDateString() : 'N/A'}</div>
              <div className="table-row-cell text-right">
                <Link 
                  to={`/compare?vehicleId=${v.id}&filter=ust`} 
                  className="btn-primary !py-1.5 !px-4 text-[10px] uppercase tracking-widest inline-flex items-center gap-2 bg-[#92400e] hover:bg-[#78350f] border-[#78350f]"
                >
                  <Droplets size={12} />
                  Start UST Service
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      <OnboardModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchVehicles}
      />
    </div>
  );
};

const DetailRow = ({ label, value }: any) => (
  <div className="flex justify-between items-center py-2 border-b border-border last:border-0 grow">
    <span className="info-label !mb-0">{label}</span>
    <span className="text-xs font-bold font-mono text-right truncate overflow-hidden ml-4">{value}</span>
  </div>
);

const SpecsTab = () => {
  const [params, setParams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<any>({
    vehicleModel: '',
    category: '',
    parameterName: '',
    standardValue: 0,
    toleranceMin: 0,
    toleranceMax: 0,
    unit: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/reference-parameters');
      setParams(data);
    } catch (error) {
      console.error('Failed to fetch params');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await apiRequest(`/reference-parameters/${editingId}`, { method: 'PUT', body: JSON.stringify(formData) });
      } else {
        await apiRequest('/reference-parameters', { method: 'POST', body: JSON.stringify(formData) });
      }
      setEditingId(null);
      setFormData({
        vehicleModel: '',
        category: '',
        parameterName: '',
        standardValue: 0,
        toleranceMin: 0,
        toleranceMax: 0,
        unit: ''
      });
      fetchData();
    } catch (error) {
      alert('Failed to save parameter');
    }
  };

  const handleEdit = (p: any) => {
    setEditingId(p.id);
    setFormData({
      vehicleModel: p.vehicleModel,
      category: p.category,
      parameterName: p.parameterName,
      standardValue: p.standardValue,
      toleranceMin: p.toleranceMin,
      toleranceMax: p.toleranceMax,
      unit: p.unit
    });
  };

  const handleDelete = async (id: number) => {
    if (confirmingId !== id) {
      setConfirmingId(id);
      setTimeout(() => setConfirmingId(null), 3000);
      return;
    }

    console.log(`[SPEC] Initiate record deletion for spec ID: ${id}`);
    try {
      await apiRequest(`/reference-parameters/${id}`, { method: 'DELETE' });
      console.log(`[SPEC] Successfully deleted spec ID: ${id}`);
      setConfirmingId(null);
      fetchData();
    } catch (error: any) {
      console.error(`[SPEC] Deletion failure for spec ID ${id}:`, error);
      alert(error.message || 'Failed to delete spec record');
      setConfirmingId(null);
    }
  };

  const filteredParams = params.filter(p => 
    p.vehicleModel.toLowerCase().includes(search.toLowerCase()) ||
    p.parameterName.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="bg-white border border-border p-6 rounded-3xl shadow-sm">
        <h3 className="text-lg font-bold mb-4">{editingId ? 'Modify Specification' : 'Establish New Specification'}</h3>
        <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-1">
            <label className="text-[10px] font-black text-text-secondary uppercase mb-1 block">Vehicle Model</label>
            <input 
              required
              className="w-full bg-bg-main border border-border rounded-xl p-3 focus:outline-none focus:border-accent-blue font-bold text-xs"
              placeholder="e.g. Corolla"
              value={formData.vehicleModel}
              onChange={e => setFormData({...formData, vehicleModel: e.target.value})}
            />
          </div>
          <div className="md:col-span-1">
            <label className="text-[10px] font-black text-text-secondary uppercase mb-1 block">Category</label>
            <input 
              required
              className="w-full bg-bg-main border border-border rounded-xl p-3 focus:outline-none focus:border-accent-blue font-bold text-xs"
              placeholder="e.g. pressure"
              value={formData.category}
              onChange={e => setFormData({...formData, category: e.target.value})}
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-[10px] font-black text-text-secondary uppercase mb-1 block">Parameter Name</label>
            <input 
              required
              className="w-full bg-bg-main border border-border rounded-xl p-3 focus:outline-none focus:border-accent-blue font-bold text-xs"
              placeholder="e.g. Tire Pressure"
              value={formData.parameterName}
              onChange={e => setFormData({...formData, parameterName: e.target.value})}
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-text-secondary uppercase mb-1 block">Standard Val</label>
            <input 
              required
              type="number" step="0.001"
              className="w-full bg-bg-main border border-border rounded-xl p-3 focus:outline-none focus:border-accent-blue font-bold text-xs"
              value={formData.standardValue}
              onChange={e => setFormData({...formData, standardValue: parseFloat(e.target.value)})}
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-text-secondary uppercase mb-1 block">Min Tol</label>
            <input 
              required
              type="number" step="0.001"
              className="w-full bg-bg-main border border-border rounded-xl p-3 focus:outline-none focus:border-accent-blue font-bold text-xs"
              value={formData.toleranceMin}
              onChange={e => setFormData({...formData, toleranceMin: parseFloat(e.target.value)})}
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-text-secondary uppercase mb-1 block">Max Tol</label>
            <input 
              required
              type="number" step="0.001"
              className="w-full bg-bg-main border border-border rounded-xl p-3 focus:outline-none focus:border-accent-blue font-bold text-xs"
              value={formData.toleranceMax}
              onChange={e => setFormData({...formData, toleranceMax: parseFloat(e.target.value)})}
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-text-secondary uppercase mb-1 block">Unit</label>
            <input 
              required
              className="w-full bg-bg-main border border-border rounded-xl p-3 focus:outline-none focus:border-accent-blue font-bold text-xs"
              placeholder="e.g. psi"
              value={formData.unit}
              onChange={e => setFormData({...formData, unit: e.target.value})}
            />
          </div>
          <div className="md:col-span-4 flex gap-2">
            <button type="submit" className="px-6 py-3 bg-accent-blue text-white rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-opacity">
              {editingId ? 'Update Ref' : 'Deploy Spec'}
            </button>
            {editingId && (
              <button 
                type="button" 
                onClick={() => {
                  setEditingId(null);
                  setFormData({
                    vehicleModel: '',
                    category: '',
                    parameterName: '',
                    standardValue: 0,
                    toleranceMin: 0,
                    toleranceMax: 0,
                    unit: ''
                  });
                }}
                className="px-6 py-3 bg-bg-main text-text-secondary rounded-xl text-xs font-black uppercase tracking-widest hover:bg-border transition-colors border border-border"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="bg-white border border-border rounded-3xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-border flex justify-between items-center">
          <h3 className="text-lg font-bold">Ref Parameter Registry</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={14} />
            <input 
              className="bg-bg-main border border-border rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-accent-blue w-64"
              placeholder="Filter by model, param, or category..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-bg-main border-b border-border">
                <th className="p-4 text-[10px] font-black text-text-secondary uppercase">Model</th>
                <th className="p-4 text-[10px] font-black text-text-secondary uppercase">Category</th>
                <th className="p-4 text-[10px] font-black text-text-secondary uppercase">Parameter</th>
                <th className="p-4 text-[10px] font-black text-text-secondary uppercase">Standard</th>
                <th className="p-4 text-[10px] font-black text-text-secondary uppercase">Range</th>
                <th className="p-4 text-[10px] font-black text-text-secondary uppercase">Unit</th>
                <th className="p-4 text-[10px] font-black text-text-secondary uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="p-12 text-center text-text-secondary italic">Accessing central spec registry...</td></tr>
              ) : filteredParams.length === 0 ? (
                <tr><td colSpan={7} className="p-12 text-center text-text-secondary italic">No parameters matching current logic.</td></tr>
              ) : filteredParams.map(p => (
                <tr key={p.id} className="border-b border-border/50 hover:bg-bg-main/50 transition-colors">
                  <td className="p-4 text-xs font-bold text-text-primary">{p.vehicleModel}</td>
                  <td className="p-4">
                    <span className="text-[10px] font-black px-2 py-1 bg-border/30 rounded uppercase text-text-secondary">{p.category}</span>
                  </td>
                  <td className="p-4 text-xs font-medium text-text-primary">{p.parameterName}</td>
                  <td className="p-4 text-xs font-mono font-bold">{p.standardValue}</td>
                  <td className="p-4 text-xs font-mono font-bold text-accent-blue">{p.toleranceMin} - {p.toleranceMax}</td>
                  <td className="p-4 text-[10px] font-black text-text-secondary uppercase tracking-widest">{p.unit}</td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => handleEdit(p)}
                        className="p-2 text-text-secondary hover:text-accent-blue hover:bg-accent-blue/10 rounded-lg transition-all"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => handleDelete(p.id)}
                        className={`flex items-center gap-1 p-2 rounded-lg transition-all duration-200 ${
                          confirmingId === p.id 
                          ? "bg-red-600 text-white px-3 text-[10px] font-bold" 
                          : "text-text-secondary hover:text-red-500 hover:bg-red-50"
                        }`}
                        title={confirmingId === p.id ? "Click again to confirm" : "Delete Spec"}
                      >
                        {confirmingId === p.id ? (
                          <>
                            <AlertCircle size={14} />
                            <span>Confirm?</span>
                          </>
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const LogoSettings = () => {
  const [logos, setLogos] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiRequest('/settings/logos').then(setLogos);
  }, []);

  const handleUpload = async (key: string, file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      setSaving(true);
      try {
        await apiRequest('/settings/logos', {
          method: 'PUT',
          body: JSON.stringify({ [key]: base64 })
        });
        setLogos(prev => ({ ...prev, [key]: base64 }));
      } catch (err) {
        alert('Failed to upload logo');
      } finally {
        setSaving(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { key: 'logo_gsa', label: 'GSA Logo', desc: 'Ghana Standards Authority' },
          { key: 'logo_elle', label: 'Eli Company Logo', desc: 'Corporate Branding' },
          { key: 'logo_npa', label: 'NPA Logo', desc: 'National Petroleum Authority (Logo & Watermark)' },
        ].map((item) => (
          <div key={item.key} className="card bg-white flex flex-col items-center text-center p-8 border-2 border-dashed border-slate-200 hover:border-accent-blue transition-colors">
            <div className="w-24 h-24 bg-slate-50 rounded-xl mb-4 flex items-center justify-center overflow-hidden border border-slate-100">
              {logos[item.key] ? (
                <img src={logos[item.key]} alt={item.label} className="max-w-full max-h-full object-contain" />
              ) : (
                <ImageIcon className="text-slate-300" size={32} />
              )}
            </div>
            <h4 className="font-bold text-slate-800">{item.label}</h4>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mt-1">{item.desc}</p>
            
            <label className="mt-6 cursor-pointer group">
              <input 
                type="file" 
                className="hidden" 
                accept="image/*"
                onChange={e => e.target.files?.[0] && handleUpload(item.key, e.target.files[0])}
              />
              <div className="px-4 py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg group-hover:bg-accent-blue transition-colors flex items-center gap-2">
                <Activity size={12} className={saving ? 'animate-spin' : ''} />
                Upload Asset
              </div>
            </label>
          </div>
        ))}
      </div>
      
      <div className="bg-accent-blue/5 border border-accent-blue/10 p-6 rounded-2xl">
         <div className="flex items-start gap-4">
            <div className="p-3 bg-white rounded-xl shadow-sm text-accent-blue">
               <ShieldCheck size={20} />
            </div>
            <div>
               <h4 className="text-sm font-bold text-slate-900">Certificate Watermark Protocol</h4>
               <p className="text-xs text-slate-500 mt-1 leading-relaxed italic serif">
                 The National Petroleum Authority (NPA) logo is used as a primary authentication watermark across all generated pressure and volumetric certificates. Ensure high-resolution transparency for optimal legibility.
               </p>
            </div>
         </div>
      </div>
    </div>
  );
};

const SettingsPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'audit' | 'system' | 'compliance' | 'specs'>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const u = await apiRequest('/users');
      const l = await apiRequest('/audit-logs');
      setUsers(u);
      setAuditLogs(l);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      await apiRequest(`/users/${userId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role: newRole })
      });
      fetchData();
    } catch (err) {
      alert(err);
    }
  };

  const handleDeleteUser = async (u: User) => {
    if (confirmingId !== u.id) {
      setConfirmingId(u.id);
      setTimeout(() => setConfirmingId(null), 3000);
      return;
    }

    console.log(`[USER] Attempting to purge user node: ${u.email}`);
    try {
      await apiRequest(`/users/${u.id}`, { method: 'DELETE' });
      console.log(`[USER] Successfully purged user node: ${u.email}`);
      setConfirmingId(null);
      fetchData();
    } catch (err: any) {
      console.error(`[USER] Purge failure for user node ${u.email}:`, err);
      alert(err.message || 'System rejection: Failed to purge personnel node.');
      setConfirmingId(null);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-screen bg-[#fafafa]">
      <div className="px-8 pt-8 pb-4 border-b border-border bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-text-primary">Administrative Core</h1>
              <p className="text-sm text-text-secondary mt-1 font-medium italic serif">Enterprise node Management & Security Protocol v2.4</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {users.slice(0, 5).map((u, i) => (
                  <div key={i} className="w-8 h-8 rounded-full bg-accent-blue/10 border-2 border-white flex items-center justify-center text-[10px] font-bold text-accent-blue ring-1 ring-accent-blue/5">
                    {u.name.charAt(0)}
                  </div>
                ))}
                {users.length > 5 && (
                  <div className="w-8 h-8 rounded-full bg-bg-main border-2 border-white flex items-center justify-center text-[10px] font-bold text-text-secondary ring-1 ring-border">
                    +{users.length - 5}
                  </div>
                )}
              </div>
              <div className="h-8 w-px bg-border mx-2" />
              <button onClick={fetchData} className="p-2 hover:bg-bg-main rounded-full transition-colors text-text-secondary">
                <Clock size={18} />
              </button>
              <button 
                onClick={() => setIsAddUserModalOpen(true)}
                className="btn-primary flex items-center gap-2 !px-4 !py-2"
              >
                <Plus size={16} />
                <span className="hidden md:inline">Add Personnel</span>
              </button>
            </div>
          </div>

          <div className="flex gap-8 overflow-x-auto no-scrollbar">
            {[
              { id: 'users', label: 'Identity Matrix', icon: <Users size={16} /> },
              { id: 'audit', label: 'Security Ledger', icon: <Activity size={16} /> },
              { id: 'specs', label: 'Calibration Specs', icon: <Gauge size={16} /> },
              { id: 'system', label: 'Lab Configuration', icon: <Settings size={16} /> },
              { id: 'compliance', label: 'Regulatory Vault', icon: <ShieldCheck size={16} /> },
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-2 pb-4 text-xs font-bold uppercase tracking-widest transition-all border-b-2 relative",
                  activeTab === tab.id 
                    ? "border-accent-blue text-accent-blue" 
                    : "border-transparent text-text-secondary hover:text-text-primary"
                )}
              >
                {tab.icon}
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div layoutId="activeTab" className="absolute -bottom-[2px] left-0 right-0 h-[2px] bg-accent-blue shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          {loading ? <div className="flex items-center justify-center h-64"><Loader /></div> : (
            <AnimatePresence mode="wait">
              {activeTab === 'users' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div className="flex flex-col md:flex-row gap-4 items-end justify-between bg-white p-6 rounded-2xl border border-border shadow-sm">
                    <div className="flex-1 max-w-md">
                      <label className="info-label italic serif !mb-3">Search Personnel</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={14} />
                        <input 
                          type="text" 
                          placeholder="Search index by name or identity reference..."
                          className="w-full pl-10 pr-4 py-2 bg-bg-main border border-border rounded-lg outline-none focus:ring-2 focus:ring-accent-blue/10 text-xs font-medium"
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-[10px] font-bold uppercase text-text-secondary tracking-tighter">Total Active Nodes</p>
                        <p className="text-2xl font-black text-accent-blue tabular-nums leading-none mt-1">{users.length}</p>
                      </div>
                      <div className="h-10 w-px bg-border" />
                      <div className="text-right">
                        <p className="text-[10px] font-bold uppercase text-text-secondary tracking-tighter">Privileged Admins</p>
                        <p className="text-2xl font-black text-text-primary tabular-nums leading-none mt-1">{users.filter(u => u.role === 'admin').length}</p>
                      </div>
                    </div>
                  </div>

                  <div className="card !p-0 overflow-hidden bg-white shadow-xl shadow-accent-blue/5">
                    <div className="grid grid-cols-12 bg-bg-main/50 border-b border-border">
                      <div className="col-span-4 p-4 text-[10px] font-bold uppercase tracking-widest text-text-secondary italic serif">Identity Record</div>
                      <div className="col-span-4 p-4 text-[10px] font-bold uppercase tracking-widest text-text-secondary italic serif">Authentication Path</div>
                      <div className="col-span-2 p-4 text-[10px] font-bold uppercase tracking-widest text-text-secondary italic serif text-center">Clearance</div>
                      <div className="col-span-2 p-4 text-[10px] font-bold uppercase tracking-widest text-text-secondary italic serif text-right">Escalation</div>
                    </div>
                    <div className="divide-y divide-border/50">
                      {filteredUsers.map(u => (
                        <div key={u.id} className="grid grid-cols-12 hover:bg-bg-main transition-colors items-center group">
                          <div className="col-span-4 p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-accent-blue/5 flex items-center justify-center text-accent-blue font-black shadow-inner shadow-accent-blue/10">
                                {u.name.charAt(0)}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-text-primary">{u.name}</p>
                                <p className="text-[10px] text-text-secondary font-mono">NODE_#{u.id.toString().padStart(4, '0')}</p>
                              </div>
                            </div>
                          </div>
                          <div className="col-span-4 p-4 text-xs font-medium text-text-secondary font-mono">{u.email}</div>
                          <div className="col-span-2 p-4 text-center">
                            <span className={cn(
                              "text-[9px] font-black uppercase tracking-tighter px-2 py-1 rounded ring-1",
                              u.role === 'admin' 
                                ? "bg-accent-blue/10 text-accent-blue ring-accent-blue/20" 
                                : "bg-bg-main text-text-secondary ring-border"
                            )}>
                              {u.role === 'admin' ? 'LVL_5_ADMIN' : 'LVL_1_TECH'}
                            </span>
                          </div>
                          <div className="col-span-2 p-4 text-right flex justify-end gap-2">
                            <select 
                              className="bg-bg-main/50 border border-border rounded px-2 py-1.5 text-[10px] font-bold hover:border-accent-blue outline-none transition-all cursor-pointer"
                              value={u.role}
                              onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            >
                              <option value="technician">TECHNICIAN</option>
                              <option value="admin">ADMINISTRATOR</option>
                            </select>
                            <button 
                              onClick={() => handleDeleteUser(u)}
                              className={`flex items-center gap-1 p-1.5 rounded-lg transition-all duration-200 ${
                                confirmingId === u.id 
                                ? "bg-red-600 text-white px-3 text-[10px] font-bold" 
                                : "hover:bg-red-50 text-slate-400 hover:text-red-500"
                              }`}
                              title={confirmingId === u.id ? "Click again to confirm" : "Revoke Access"}
                            >
                              {confirmingId === u.id ? (
                                <>
                                  <AlertCircle size={14} />
                                  <span>Confirm?</span>
                                </>
                              ) : (
                                <Trash2 size={14} />
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'audit' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6 max-w-5xl mx-auto"
                >
                  <div className="grid grid-cols-3 gap-6">
                    <div className="card bg-white border-l-4 border-l-accent-blue">
                      <p className="text-[10px] font-bold text-text-secondary uppercase italic serif">Log Density</p>
                      <p className="text-3xl font-black mt-2 tabular-nums">1.4k</p>
                      <p className="text-[10px] text-text-secondary mt-1 font-medium">Events captured in current cycle</p>
                    </div>
                    <div className="card bg-white border-l-4 border-l-green-500">
                      <p className="text-[10px] font-bold text-text-secondary uppercase italic serif">Auth Success</p>
                      <p className="text-3xl font-black mt-2 tabular-nums">98.2%</p>
                      <p className="text-[10px] text-text-secondary mt-1 font-medium">Normal verification pattern</p>
                    </div>
                    <div className="card bg-white border-l-4 border-l-orange-500">
                      <p className="text-[10px] font-bold text-text-secondary uppercase italic serif">System Alerts</p>
                      <p className="text-3xl font-black mt-2 tabular-nums">04</p>
                      <p className="text-[10px] text-text-secondary mt-1 font-medium">Anomalous entries detected</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {auditLogs.map(log => {
                      const isHighValue = log.action.includes('APPROVED');
                      const isLowValue = log.action.includes('REJECTED') || log.action.includes('FAILED');
                      return (
                        <div key={log.id} className="relative group overflow-hidden bg-white border border-border p-5 rounded-2xl flex gap-6 hover:shadow-xl hover:shadow-accent-blue/5 transition-all">
                          <div className={cn(
                            "absolute left-0 top-0 bottom-0 w-1",
                            isHighValue ? "bg-green-500" : isLowValue ? "bg-red-500" : "bg-accent-blue/50"
                          )} />
                          <div className="flex flex-col items-center justify-center pointer-events-none">
                            <div className="text-[10px] font-black font-mono text-text-secondary uppercase">{new Date(log.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                            <div className="text-xl font-black text-text-primary tabular-nums mt-1">{new Date(log.timestamp).getHours()}:{new Date(log.timestamp).getMinutes()}</div>
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start mb-2">
                              <span className={cn(
                                "text-xs font-black tracking-tight uppercase",
                                isHighValue ? "text-green-600" : isLowValue ? "text-red-600" : "text-accent-blue"
                              )}>{log.action}</span>
                              <span className="text-[9px] font-mono text-text-secondary bg-bg-main px-2 py-0.5 rounded border border-border/50 uppercase">Trace_ID: EX_{log.id.toString().padStart(6, '0')}</span>
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-4 h-4 rounded-full bg-bg-main flex items-center justify-center text-text-secondary">
                                <Users size={10} />
                              </div>
                              <span className="text-[11px] font-bold text-text-primary">{log.userEmail || 'Automated System'}</span>
                            </div>
                            {log.details && (
                              <div className="p-2 bg-bg-main/30 rounded-lg text-[10px] font-mono text-text-secondary border border-border/10">
                                {log.details}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {activeTab === 'specs' && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <SpecsTab />
                </motion.div>
              )}

              {activeTab === 'system' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-8"
                >
                  <LogoSettings />
                </motion.div>
              )}

              {activeTab === 'compliance' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="max-w-4xl mx-auto space-y-8"
                >
                  <div className="p-12 border-2 border-dashed border-border rounded-[32px] flex flex-col items-center justify-center text-center bg-white shadow-inner">
                    <div className="w-20 h-20 rounded-full bg-bg-main flex items-center justify-center mb-6 ring-8 ring-accent-blue/5">
                      <ShieldCheck size={40} className="text-accent-blue" />
                    </div>
                    <h2 className="text-2xl font-black text-text-primary">Compliance & Legal Protocol</h2>
                    <p className="text-sm text-text-secondary max-w-md mt-4 leading-relaxed font-medium">
                      All laboratory certifications and regulatory documentation are encrypted and archived. Digital signatures are verified against active administrative nodes.
                    </p>
                    <div className="flex items-center gap-4 mt-12 bg-bg-main p-1 rounded-2xl border border-border">
                       <button className="px-8 py-3 rounded-xl bg-white text-xs font-bold uppercase tracking-widest text-text-primary shadow-sm border border-border hover:bg-bg-main transition-colors">Internal Audit</button>
                       <button className="px-8 py-3 rounded-xl bg-accent-blue text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-accent-blue/30 hover:opacity-90 transition-opacity">Secure Vault Access</button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-6 bg-white rounded-2xl border border-border flex items-center gap-4 group hover:border-accent-blue transition-colors cursor-pointer">
                      <div className="w-12 h-12 rounded-xl bg-bg-main flex items-center justify-center text-text-secondary group-hover:text-accent-blue transition-colors">
                        <FileText size={20} />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-text-primary">ISO 9001:2015 Protocol</p>
                        <p className="text-[10px] text-text-secondary font-medium">Certification valid through June 2027</p>
                      </div>
                      <ChevronRight size={16} className="text-border group-hover:text-accent-blue transition-colors" />
                    </div>
                    <div className="p-6 bg-white rounded-2xl border border-border flex items-center gap-4 group hover:border-accent-blue transition-colors cursor-pointer">
                      <div className="w-12 h-12 rounded-xl bg-bg-main flex items-center justify-center text-text-secondary group-hover:text-accent-blue transition-colors">
                        <ClipboardCheck size={20} />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-text-primary">Calibration Method Traceability</p>
                        <p className="text-[10px] text-text-secondary font-medium">NIST traceable documentation</p>
                      </div>
                      <ChevronRight size={16} className="text-border group-hover:text-accent-blue transition-colors" />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>

      <AddUserModal 
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        onSuccess={fetchData}
      />
    </div>
  );
};

// --- Main App Logic ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
    }
    setAuthReady(true);

    const handleAuthFailure = () => {
      logout();
    };

    window.addEventListener('auth-failure', handleAuthFailure);
    return () => window.removeEventListener('auth-failure', handleAuthFailure);
  }, [token]);

  const handleLoginSuccess = (newToken: string, newUser: User) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  if (!authReady) return <Loader />;

  return (
    <BrowserRouter>
      {!user ? (
        <Routes>
          <Route path="/login" element={<LoginPage onLoginSuccess={handleLoginSuccess} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      ) : (
        <div className="flex min-h-screen bg-bg">
          <Sidebar user={user} onLogout={logout} />
          <main className="flex-1 ml-60 min-h-screen">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/vehicles" element={<VehiclesPage user={user} />} />
              <Route path="/pressure-calibration" element={<PressureCalibrationPage />} />
              <Route path="/tank-calibration" element={<TankCalibrationPage />} />
              <Route path="/compare" element={<ComparePage />} />
              <Route path="/reports" element={<ReportsPage user={user} />} />
              <Route path="/reports/:id" element={<ReportDetailPage user={user} />} />
              <Route path="/settings" element={user.role === 'admin' ? <SettingsPage /> : <Navigate to="/" />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      )}
    </BrowserRouter>
  );
}
