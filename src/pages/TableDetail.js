import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { tableService, rowService } from '../services/api';
import toast from 'react-hot-toast';
import Cropper from 'react-easy-crop';
import {
  FiArrowRight, FiPlus, FiTrash2, FiEdit3, FiCamera,
  FiUpload, FiX, FiSave, FiImage, FiSearch, FiGrid,
  FiChevronLeft, FiChevronRight,
} from 'react-icons/fi';

const DEBOUNCE_MS = 1000;

const TableDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [table, setTable] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRowModal, setShowRowModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [editingRow, setEditingRow] = useState(null);
  const [rowFormData, setRowFormData] = useState({});
  const [rowName, setRowName] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);
  const [cropImage, setCropImage] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRowForImages, setSelectedRowForImages] = useState(null);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [viewerImages, setViewerImages] = useState([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [viewerZoom, setViewerZoom] = useState(1);

  const openImageViewer = (images, index = 0) => {
    setViewerImages(images);
    setViewerIndex(index);
    setViewerZoom(1);
    setShowImageViewer(true);
  };

  const handleKeyDown = useCallback((e) => {
    if (!showImageViewer) return;
    if (e.key === 'ArrowLeft') { setViewerIndex((i) => (i + 1) % viewerImages.length); setViewerZoom(1); }
    if (e.key === 'ArrowRight') { setViewerIndex((i) => (i - 1 + viewerImages.length) % viewerImages.length); setViewerZoom(1); }
    if (e.key === 'Escape') setShowImageViewer(false);
  }, [showImageViewer, viewerImages.length]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchQuery(searchInput);
    }, DEBOUNCE_MS);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchInput]);

  useEffect(() => {
    fetchRows();
  }, [id, searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchTable = async () => {
    try {
      const response = await tableService.getById(id);
      setTable(response.data.table);
    } catch (error) {
      toast.error('خطأ في تحميل الجدول');
      navigate('/');
    }
  };

  const fetchRows = async () => {
    setLoading(true);
    try {
      await fetchTable();
      const response = await rowService.getByTable(id, searchQuery || null);
      setRows(response.data.rows);
    } catch (error) {
      toast.error('خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const handleRowSubmit = async (e) => {
    e.preventDefault();
    if (!rowName.trim()) {
      toast.error('اسم الصف مطلوب');
      return;
    }
    try {
      if (editingRow) {
        await rowService.update(id, editingRow._id, { name: rowName, data: rowFormData });
        toast.success('تم تحديث الصف بنجاح');
      } else {
        await rowService.create(id, { name: rowName, data: rowFormData });
        toast.success('تم إضافة الصف بنجاح');
      }
      setShowRowModal(false);
      setEditingRow(null);
      setRowFormData({});
      setRowName('');
      fetchRows();
    } catch (error) {
      toast.error(error.response?.data?.message || 'خطأ في حفظ الصف');
    }
  };

  const handleDeleteRow = async (rowId) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الصف؟')) {
      try {
        await rowService.delete(id, rowId);
        toast.success('تم حذف الصف بنجاح');
        fetchRows();
      } catch (error) {
        toast.error('خطأ في حذف الصف');
      }
    }
  };

  const handleImageSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setSelectedImages(files);
    setShowImageModal(true);
    e.target.value = '';
  };

  const handleCropComplete = useCallback((croppedArea, croppedAreaPixels) => {}, []);

  const handleHouseCardUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCropImage(reader.result);
      setShowCropModal(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCropSave = async () => {
    try {
      const canvas = document.createElement('canvas');
      const img = new Image();
      img.src = cropImage;
      await new Promise((resolve) => { img.onload = resolve; });

      const maxSize = 800;
      let { width, height } = img;
      if (width > height && width > maxSize) { height = (height * maxSize) / width; width = maxSize; }
      else if (height > maxSize) { width = (width * maxSize) / height; height = maxSize; }

      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);

      canvas.toBlob(async (blob) => {
        const file = new File([blob], 'house-card.jpg', { type: 'image/jpeg' });
        const formData = new FormData();
        formData.append('houseCard', file);
        await tableService.uploadImage(id, formData);
        toast.success('تم رفع الصورة بنجاح');
        setShowCropModal(false);
        setCropImage(null);
        fetchRows();
      }, 'image/jpeg', 0.9);
    } catch (error) {
      toast.error('خطأ في رفع الصورة');
    }
  };

  const handleRowImagesUpload = async () => {
    try {
      if (selectedRowForImages) {
        const formData = new FormData();
        selectedImages.forEach((file) => { formData.append('images', file); });
        await rowService.uploadImages(id, selectedRowForImages._id, formData);
        toast.success('تم رفع الصور بنجاح');
        setShowImageModal(false);
        setSelectedImages([]);
        setSelectedRowForImages(null);
        fetchRows();
      }
    } catch (error) {
      toast.error('خطأ في رفع الصور');
    }
  };

  const handleDeleteImage = async (rowId, imageIndex) => {
    if (window.confirm('هل أنت متأكد من حذف هذه الصورة؟')) {
      try {
        await rowService.deleteImage(id, rowId, imageIndex);
        toast.success('تم حذف الصورة بنجاح');
        fetchRows();
      } catch (error) {
        toast.error('خطأ في حذف الصورة');
      }
    }
  };

  const openEditRowModal = (row) => {
    setEditingRow(row);
    setRowName(row.name || '');
    setRowFormData(row.data || {});
    setShowRowModal(true);
  };

  const openAddRowModal = () => {
    setEditingRow(null);
    setRowName('');
    setRowFormData({});
    setShowRowModal(true);
  };

  const openRowDetail = (row) => {
    setSelectedRow(row);
    setShowDetailModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!table) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">الجدول غير موجود</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="gradient-bg text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/')} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <FiArrowRight size={20} />
              </button>
              <div>
                <h1 className="text-xl font-bold">{table.name}</h1>
                {table.description && <p className="text-sm text-primary-200">{table.description}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="file" ref={fileInputRef} onChange={handleHouseCardUpload} accept="image/*" className="hidden" />
              <input type="file" ref={cameraInputRef} onChange={handleImageSelect} accept="image/*" capture="environment" className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} className="p-2 hover:bg-white/10 rounded-lg transition-colors" title="Upload صورة بطاقة المنزل">
                <FiCamera size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {table.houseCardImage && (
          <div className="card mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><FiImage /> صورة بطاقة المنزل</h3>
            <div className="rounded-lg overflow-hidden">
              <img src={table.houseCardImage} alt="House Card" className="w-full max-h-96 object-contain" />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-1 min-w-[200px]">
            <div className="relative flex-1">
              <FiSearch className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="بحث بالاسم..."
                className="input-field pr-10"
              />
            </div>
          </div>
          <button onClick={openAddRowModal} className="btn-primary flex items-center gap-2">
            <FiPlus size={20} /><span>إضافة صف</span>
          </button>
        </div>

        {rows.length === 0 ? (
          <div className="text-center py-16">
            <FiGrid size={64} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">لا توجد صفوف</h3>
            <p className="text-gray-500 mb-6">ابدأ بإضافة أول صف</p>
            <button onClick={openAddRowModal} className="btn-primary">إضافة صف</button>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-primary-600 text-white">
                  <tr>
                    <th className="px-4 py-3 text-right">#</th>
                    <th className="px-4 py-3 text-right">الاسم</th>
                    {table.columns?.map((col) => (
                      <th key={col.key} className="px-4 py-3 text-right">{col.label}</th>
                    ))}
                    <th className="px-4 py-3 text-right">الصور</th>
                    <th className="px-4 py-3 text-right">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rows.map((row, index) => (
                    <tr key={row._id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openRowDetail(row)}>
                      <td className="px-4 py-3 text-gray-600">{index + 1}</td>
                      <td className="px-4 py-3 text-gray-800 font-medium">{row.name || '-'}</td>
                      {table.columns?.map((col) => (
                        <td key={col.key} className="px-4 py-3 text-gray-800">{row.data?.[col.key] || '-'}</td>
                      ))}
                      <td className="px-4 py-3">
                        <div className="flex gap-2 items-center" onClick={(e) => e.stopPropagation()}>
                          {row.images?.slice(0, 3).map((img, imgIndex) => (
                            <div key={imgIndex} className="relative group">
                              <img src={img.url} alt="" className="w-10 h-10 object-cover rounded cursor-pointer" onClick={(e) => { e.stopPropagation(); openImageViewer(row.images, imgIndex); }} />
                              <button onClick={() => handleDeleteImage(row._id, imgIndex)}
                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <FiX size={10} />
                              </button>
                            </div>
                          ))}
                          {row.images?.length > 3 && <span className="text-xs text-gray-500">+{row.images.length - 3}</span>}
                          <button onClick={() => { setSelectedRowForImages(row); setShowImageModal(true); }}
                            className="text-primary-600 hover:text-primary-800"><FiCamera size={16} /></button>
                        </div>
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-2">
                          <button onClick={() => openEditRowModal(row)} className="text-primary-600 hover:text-primary-800"><FiEdit3 size={16} /></button>
                          <button onClick={() => handleDeleteRow(row._id)} className="text-red-600 hover:text-red-800"><FiTrash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Row Detail Modal */}
      {showDetailModal && selectedRow && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">تفاصيل الصف</h3>
              <button onClick={() => { setShowDetailModal(false); setSelectedRow(null); }} className="p-2 hover:bg-gray-100 rounded-lg">
                <FiX size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-primary-50 rounded-lg p-4">
                <p className="text-sm text-primary-600 mb-1">اسم الجدول</p>
                <p className="font-bold text-primary-900">{table.name}</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">اسم الصف</p>
                <p className="font-bold text-gray-800 text-lg">{selectedRow.name || '-'}</p>
              </div>

              {table.columns?.map((col) => (
                <div key={col.key} className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-1">{col.label}</p>
                  <p className="font-medium text-gray-800">{selectedRow.data?.[col.key] || '-'}</p>
                </div>
              ))}

              {selectedRow.images && selectedRow.images.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-3">الصور ({selectedRow.images.length})</p>
                  <div className="grid grid-cols-3 gap-3">
                    {selectedRow.images.map((img, idx) => (
                      <div key={idx} className="relative group cursor-pointer" onClick={() => openImageViewer(selectedRow.images, idx)}>
                        <img src={img.url} alt="" className="w-full h-32 object-cover rounded-lg" />
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteImage(selectedRow._id, idx); }}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <FiX size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-xs text-gray-400 text-left pt-2">
                أضيف: {new Date(selectedRow.createdAt).toLocaleString('ar-SA')}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowDetailModal(false); openEditRowModal(selectedRow); }} className="flex-1 btn-primary flex items-center justify-center gap-2">
                <FiEdit3 size={16} />تعديل
              </button>
              <button onClick={() => { setSelectedRowForImages(selectedRow); setShowDetailModal(false); setShowImageModal(true); }}
                className="flex-1 btn-primary flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700">
                <FiCamera size={16} />إضافة صور
              </button>
              <button onClick={() => { setShowDetailModal(false); setSelectedRow(null); }} className="flex-1 btn-secondary">
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Viewer */}
      {showImageViewer && viewerImages.length > 0 && (
        <div className="fixed inset-0 bg-black z-[100] flex items-center justify-center"
          onWheel={(e) => { e.preventDefault(); setViewerZoom((z) => Math.min(Math.max(z + (e.deltaY > 0 ? -0.2 : 0.2), 0.5), 5)); }}>
          <button onClick={() => setShowImageViewer(false)}
            className="absolute top-4 left-4 text-white p-2 hover:bg-white/20 rounded-full z-10">
            <FiX size={28} />
          </button>
          <button onClick={() => { setViewerIndex((i) => (i - 1 + viewerImages.length) % viewerImages.length); setViewerZoom(1); }}
            className="absolute left-4 text-white p-3 hover:bg-white/20 rounded-full z-10">
            <FiChevronRight size={32} />
          </button>
          <img src={viewerImages[viewerIndex].url} alt=""
            className="max-w-full max-h-full object-contain transition-transform duration-200"
            style={{ transform: `scale(${viewerZoom})`, cursor: 'zoom-in' }}
            draggable={false} />
          <button onClick={() => { setViewerIndex((i) => (i + 1) % viewerImages.length); setViewerZoom(1); }}
            className="absolute right-4 text-white p-3 hover:bg-white/20 rounded-full z-10">
            <FiChevronLeft size={32} />
          </button>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/50 px-4 py-2 rounded-full">
            <button onClick={() => setViewerZoom((z) => Math.min(z + 0.5, 5))} className="text-white text-xl font-bold px-2">+</button>
            <span className="text-white text-sm">{Math.round(viewerZoom * 100)}%</span>
            <button onClick={() => setViewerZoom((z) => Math.max(z - 0.5, 0.5))} className="text-white text-xl font-bold px-2">-</button>
            <span className="text-white text-sm ml-2">{viewerIndex + 1} / {viewerImages.length}</span>
          </div>
        </div>
      )}

      {/* Row Modal */}
      {showRowModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-800 mb-6">
              {editingRow ? 'تعديل الصف' : 'إضافة صف جديد'}
            </h3>
            <form onSubmit={handleRowSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">اسم الصف *</label>
                <input type="text" value={rowName} onChange={(e) => setRowName(e.target.value)}
                  className="input-field" placeholder="أدخل اسم الصف" required />
              </div>
              {table.columns?.map((col) => (
                <div key={col.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{col.label}</label>
                  {col.type === 'select' ? (
                    <select value={rowFormData[col.key] || ''} onChange={(e) => setRowFormData({ ...rowFormData, [col.key]: e.target.value })} className="input-field">
                      <option value="">اختر...</option>
                      {col.options?.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                    </select>
                  ) : (
                    <input type={col.type === 'date' ? 'date' : col.type === 'number' ? 'number' : 'text'}
                      value={rowFormData[col.key] || ''} onChange={(e) => setRowFormData({ ...rowFormData, [col.key]: e.target.value })}
                      className="input-field" placeholder={`أدخل ${col.label}`} />
                  )}
                </div>
              ))}
              <div className="flex gap-3 mt-6">
                <button type="submit" className="flex-1 btn-primary" disabled={!rowName.trim()}>
                  <FiSave className="inline ml-2" />{editingRow ? 'تحديث' : 'إضافة'}
                </button>
                <button type="button" onClick={() => { setShowRowModal(false); setEditingRow(null); setRowName(''); }}
                  className="flex-1 btn-secondary">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Upload Modal */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-6">رفع صور</h3>
            <div className="space-y-4">
              <button onClick={() => cameraInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 transition-colors">
                <FiCamera size={24} className="text-gray-400" /><span className="text-gray-600">التقاط صورة بالكاميرا</span>
              </button>
              <button onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.multiple = true; input.accept = 'image/*';
                input.onchange = (e) => { setSelectedImages([...selectedImages, ...Array.from(e.target.files)]); }; input.click(); }}
                className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 transition-colors">
                <FiUpload size={24} className="text-gray-400" /><span className="text-gray-600">اختيار صور من الجهاز</span>
              </button>
              {selectedImages.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mt-4">
                  {selectedImages.map((file, index) => (
                    <div key={index} className="relative">
                      <img src={URL.createObjectURL(file)} alt="" className="w-full h-20 object-cover rounded" />
                      <button onClick={() => setSelectedImages(selectedImages.filter((_, i) => i !== index))}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"><FiX size={10} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleRowImagesUpload} disabled={selectedImages.length === 0} className="flex-1 btn-primary disabled:opacity-50">
                <FiUpload className="inline ml-2" />رفع الصور ({selectedImages.length})
              </button>
              <button onClick={() => { setShowImageModal(false); setSelectedImages([]); setSelectedRowForImages(null); }} className="flex-1 btn-secondary">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Crop Modal */}
      {showCropModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-6">قص الصورة</h3>
            <div className="relative h-80 rounded-lg overflow-hidden">
              <Cropper image={cropImage} crop={crop} zoom={zoom} aspect={4 / 3}
                onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={handleCropComplete} />
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">التكبير: {zoom.toFixed(1)}x</label>
              <input type="range" min={1} max={3} step={0.1} value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} className="w-full" />
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleCropSave} className="flex-1 btn-primary"><FiSave className="inline ml-2" />حفظ الصورة</button>
              <button onClick={() => { setShowCropModal(false); setCropImage(null); }} className="flex-1 btn-secondary">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TableDetail;
