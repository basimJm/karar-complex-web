import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { tableService } from '../services/api';
import toast from 'react-hot-toast';
import { FiPlus, FiGrid, FiLogOut, FiTrash2, FiEdit3, FiImage } from 'react-icons/fi';

const Dashboard = () => {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      const response = await tableService.getAll();
      setTables(response.data.tables);
    } catch (error) {
      toast.error('خطأ في تحميل الجداول');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTable) {
        await tableService.update(editingTable._id, formData);
        toast.success('تم تحديث الجدول بنجاح');
      } else {
        await tableService.create(formData);
        toast.success('تم إنشاء الجدول بنجاح');
      }
      setShowModal(false);
      setEditingTable(null);
      setFormData({ name: '', description: '' });
      fetchTables();
    } catch (error) {
      toast.error(error.response?.data?.message || 'خطأ في حفظ الجدول');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الجدول؟')) {
      try {
        await tableService.delete(id);
        toast.success('تم حذف الجدول بنجاح');
        fetchTables();
      } catch (error) {
        toast.error('خطأ في حذف الجدول');
      }
    }
  };

  const openEditModal = (table) => {
    setEditingTable(table);
    setFormData({ name: table.name, description: table.description || '' });
    setShowModal(true);
  };

  const openCreateModal = () => {
    setEditingTable(null);
    setFormData({ name: '', description: '' });
    setShowModal(true);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="gradient-bg text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 gold-gradient rounded-full flex items-center justify-center">
                <span className="text-lg font-bold">م</span>
              </div>
              <div>
                <h1 className="text-xl font-bold">مجمع الكداد السكني</h1>
                <p className="text-sm text-primary-200">نظام إدارة الجداول</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm">{user?.name}</span>
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <FiLogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-800">الجداول</h2>
          <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
            <FiPlus size={20} />
            <span>إضافة جدول</span>
          </button>
        </div>

        {tables.length === 0 ? (
          <div className="text-center py-16">
            <FiGrid size={64} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">لا توجد جداول</h3>
            <p className="text-gray-500 mb-6">ابدأ بإنشاء أول جدول</p>
            <button onClick={openCreateModal} className="btn-primary">
              إنشاء جدول
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tables.map((table) => (
              <div key={table._id} className="card hover:cursor-pointer group">
                <Link to={`/table/${table._id}`}>
                  {table.houseCardImage && (
                    <div className="mb-4 rounded-lg overflow-hidden">
                      <img
                        src={table.houseCardImage}
                        alt={table.name}
                        className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  {!table.houseCardImage && (
                    <div className="mb-4 rounded-lg bg-gradient-to-br from-primary-100 to-primary-200 h-48 flex items-center justify-center">
                      <FiImage size={48} className="text-primary-400" />
                    </div>
                  )}
                  <h3 className="text-lg font-bold text-gray-800 mb-2">{table.name}</h3>
                  {table.description && (
                    <p className="text-gray-600 text-sm mb-4">{table.description}</p>
                  )}
                  <div className="text-xs text-gray-500">
                    {new Date(table.createdAt).toLocaleDateString('ar-SA')}
                  </div>
                </Link>
                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      openEditModal(table);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                  >
                    <FiEdit3 size={16} />
                    <span>تعديل</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleDelete(table._id);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <FiTrash2 size={16} />
                    <span>حذف</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-6">
              {editingTable ? 'تعديل الجدول' : 'إضافة جدول جديد'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  اسم الجدول
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  placeholder="أدخل اسم الجدول"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الوصف (اختياري)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-field"
                  placeholder="أدخل وصف الجدول"
                  rows={3}
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button type="submit" className="flex-1 btn-primary">
                  {editingTable ? 'تحديث' : 'إنشاء'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingTable(null);
                  }}
                  className="flex-1 btn-secondary"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
