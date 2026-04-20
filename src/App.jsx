import { useState, useMemo, useEffect } from "react";
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Settings,
  Edit2,
  Trash2,
  Star,
  AlignLeft,
  Plus,
  Type,
  HelpCircle,
  List,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Copy,
  Cloud,
  CloudOff,
  RefreshCw,
} from "lucide-react";

// 引入 Firebase 模組
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, setDoc, onSnapshot } from "firebase/firestore";

// ====== Firebase 初始化設定 ======
const firebaseConfig = {
  apiKey: "AIzaSyAOr2Lvm0XcHqD4Huct8HW08LltduIBALM",
  authDomain: "volley-friends-db.firebaseapp.com",
  projectId: "volley-friends-db",
  storageBucket: "volley-friends-db.firebasestorage.app",
  messagingSenderId: "159697430554",
  appId: "1:159697430554:web:137c7c222dcade938649a3",
  measurementId: "G-H9D19XD0L7",
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 常數定義
const POSITIONS = ["舉球", "主攻", "副攻", "攔中", "自由"];
// 新房間預設會給予的基礎欄位模板
const INITIAL_CUSTOM_FIELDS = [
  { id: "skill", name: "程度", type: "rating" },
  { id: "comp", name: "勝負欲", type: "rating" },
  { id: "friendliness", name: "友善度", type: "rating" },
  {
    id: "orientation",
    name: "性傾向",
    type: "choice",
    options: ["同性戀", "異性戀", "雙性戀", "第三性", "不確定"],
  },
  { id: "note", name: "備註", type: "text" },
];

export default function App() {
  // ====== 雲端同步狀態 ======
  const [user, setUser] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [copied, setCopied] = useState(false);

  // 自動產生或讀取一個 6 碼的 Sync ID (跨裝置房間號碼)
  const [syncId, setSyncId] = useState(() => {
    return (
      localStorage.getItem("volleyball_sync_id") ||
      Math.random().toString(36).substring(2, 8).toUpperCase()
    );
  });
  const [inputSyncId, setInputSyncId] = useState("");

  const [activeTab, setActiveTab] = useState("list");
  // 已經清除寫死的假資料，預設為空陣列
  const [friends, setFriends] = useState([]);
  const [customFields, setCustomFields] = useState([]);

  // 1. Firebase 匿名登入 (乾淨的正式版寫法)
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (e) {
        console.error("登入失敗，請確認 Firebase 設定是否填寫正確", e);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // 2. 即時監聽雲端資料 (自動同步)
  useEffect(() => {
    if (!user) return;

    localStorage.setItem("volleyball_sync_id", syncId);

    // 指向資料庫中的專屬 Sync ID 文件 (標準路徑)
    const docRef = doc(db, "rosters", syncId);

    setIsSyncing(true);
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setFriends(data.friends || []);
          setCustomFields(data.customFields || []);
        } else {
          // 如果是全新的房間，塞入空的球友名單與預設欄位模板
          setFriends([]);
          setCustomFields(INITIAL_CUSTOM_FIELDS);
          setDoc(docRef, { friends: [], customFields: INITIAL_CUSTOM_FIELDS });
        }
        setIsSyncing(false);
      },
      (error) => {
        console.error("讀取資料失敗:", error);
        setIsSyncing(false);
      },
    );

    return () => unsubscribe();
  }, [user, syncId]);

  // 3. 寫入雲端的輔助函式
  const updateCloudData = async (newFriends, newFields) => {
    if (!user) return;
    try {
      const docRef = doc(db, "rosters", syncId);
      await setDoc(docRef, { friends: newFriends, customFields: newFields });
    } catch (e) {
      console.error("儲存失敗:", e);
    }
  };

  // 切換 Sync ID
  const handleSwitchSyncId = () => {
    if (inputSyncId.trim().length === 6) {
      setSyncId(inputSyncId.trim().toUpperCase());
      setInputSyncId("");
      setActiveTab("list");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // ====== 畫面操作狀態 ======
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeTab]);

  const [formData, setFormData] = useState({
    id: null,
    name: "",
    positions: [],
    attributes: {},
  });
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const [showFilters, setShowFilters] = useState(false);
  const [filterName, setFilterName] = useState("");
  const [filterPositions, setFilterPositions] = useState([]);
  const [filterRatings, setFilterRatings] = useState({});

  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState("rating");
  const [newFieldOptions, setNewFieldOptions] = useState("");

  const [navPos, setNavPos] = useState({ x: 0, y: 0 });
  const [isDraggingNav, setIsDraggingNav] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // ====== 互動處理邏輯 (加上雲端寫入) ======
  const handleSaveFriend = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || formData.positions.length === 0) return;

    let newFriends;
    if (formData.id) {
      newFriends = friends.map((f) =>
        f.id === formData.id ? { ...formData } : f,
      );
    } else {
      newFriends = [...friends, { ...formData, id: Date.now().toString() }];
    }
    setFriends(newFriends);
    setActiveTab("list");
    await updateCloudData(newFriends, customFields); // 寫入雲端
  };

  const handleDeleteFriend = async (id) => {
    const newFriends = friends.filter((f) => f.id !== id);
    setFriends(newFriends);
    setConfirmDeleteId(null);
    await updateCloudData(newFriends, customFields); // 寫入雲端
  };

  const handleAddField = async (e) => {
    e.preventDefault();
    if (!newFieldName.trim()) return;

    const newField = {
      id: Date.now().toString(),
      name: newFieldName.trim(),
      type: newFieldType,
    };
    if (newFieldType === "choice") {
      if (!newFieldOptions.trim()) return;
      newField.options = newFieldOptions
        .split(/[,，]/)
        .map((opt) => opt.trim())
        .filter(Boolean);
    }
    const newFields = [...customFields, newField];
    setCustomFields(newFields);
    setNewFieldName("");
    setNewFieldOptions("");
    await updateCloudData(friends, newFields); // 寫入雲端
  };

  const handleDeleteField = async (fieldId) => {
    const newFields = customFields.filter((f) => f.id !== fieldId);
    const newFriends = friends.map((friend) => {
      const newAttributes = { ...friend.attributes };
      delete newAttributes[fieldId];
      return { ...friend, attributes: newAttributes };
    });
    setCustomFields(newFields);
    setFriends(newFriends);
    await updateCloudData(newFriends, newFields); // 寫入雲端
  };

  // 排序與導覽列邏輯
  const [draggedIdx, setDraggedIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);

  const handleDragStart = (e, index) => setDraggedIdx(index);
  const handleDragEnter = (e, index) => {
    e.preventDefault();
    setDragOverIdx(index);
  };
  const handleDragOver = (e) => e.preventDefault();

  const handleDrop = async (e, index) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === index) return;
    const newFields = [...customFields];
    const draggedItem = newFields[draggedIdx];
    newFields.splice(draggedIdx, 1);
    newFields.splice(index, 0, draggedItem);
    setCustomFields(newFields);
    setDraggedIdx(null);
    setDragOverIdx(null);
    await updateCloudData(friends, newFields); // 寫入雲端
  };
  const handleDragEnd = () => {
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const moveField = async (index, direction) => {
    const newFields = [...customFields];
    if (direction === "up" && index > 0) {
      [newFields[index - 1], newFields[index]] = [
        newFields[index],
        newFields[index - 1],
      ];
    } else if (direction === "down" && index < newFields.length - 1) {
      [newFields[index + 1], newFields[index]] = [
        newFields[index],
        newFields[index + 1],
      ];
    }
    setCustomFields(newFields);
    await updateCloudData(friends, newFields); // 寫入雲端
  };

  const handleNavMouseDown = (e) => {
    if (window.innerWidth < 768) return;
    setIsDraggingNav(true);
    setDragStart({ x: e.clientX - navPos.x, y: e.clientY - navPos.y });
  };

  useEffect(() => {
    const handleNavMouseMove = (e) => {
      if (!isDraggingNav) return;
      setNavPos({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    };
    const handleNavMouseUp = () => setIsDraggingNav(false);
    if (isDraggingNav) {
      document.addEventListener("mousemove", handleNavMouseMove);
      document.addEventListener("mouseup", handleNavMouseUp);
    }
    return () => {
      document.removeEventListener("mousemove", handleNavMouseMove);
      document.removeEventListener("mouseup", handleNavMouseUp);
    };
  }, [isDraggingNav, dragStart]);

  // 表單操作與篩選器
  const openAddForm = () => {
    const initialAttributes = {};
    customFields.forEach((f) => {
      if (f.type === "rating") initialAttributes[f.id] = 3;
      if (f.type === "text" || f.type === "yesno" || f.type === "choice")
        initialAttributes[f.id] = "";
    });
    setFormData({
      id: null,
      name: "",
      positions: [],
      attributes: initialAttributes,
    });
    setActiveTab("form");
  };

  const openEditForm = (friend) => {
    setFormData({
      id: friend.id,
      name: friend.name,
      positions: [...friend.positions],
      attributes: { ...friend.attributes },
    });
    setActiveTab("form");
  };

  const togglePosition = (pos, currentList, onChange) => {
    if (currentList.includes(pos))
      onChange(currentList.filter((p) => p !== pos));
    else onChange([...currentList, pos]);
  };

  const filteredFriends = useMemo(() => {
    return friends.filter((friend) => {
      if (
        filterName &&
        !friend.name.toLowerCase().includes(filterName.toLowerCase())
      )
        return false;
      if (filterPositions.length > 0) {
        const hasMatchingPosition = friend.positions.some((pos) =>
          filterPositions.includes(pos),
        );
        if (!hasMatchingPosition) return false;
      }
      for (const field of customFields) {
        if (field.type === "rating" && filterRatings[field.id]) {
          const friendValue = friend.attributes[field.id] || 0;
          if (friendValue < filterRatings[field.id]) return false;
        }
      }
      return true;
    });
  }, [friends, filterName, filterPositions, filterRatings, customFields]);

  // ====== UI 元件 ======
  const RatingInput = ({ label, value, onChange }) => (
    <div className="mb-5">
      <div className="flex justify-between items-center mb-3">
        <label className="font-semibold text-slate-700 flex items-center gap-2">
          <Star size={16} className="text-emerald-500" /> {label}
        </label>
        <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
          Lv. {value || 3}
        </span>
      </div>
      <div className="flex justify-between gap-2">
        {[1, 2, 3, 4, 5].map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => onChange(num)}
            className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${
              (value || 3) === num
                ? "bg-emerald-500 text-white shadow-[0_4px_12px_rgba(16,185,129,0.3)] border border-emerald-500"
                : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300"
            }`}
          >
            {num}
          </button>
        ))}
      </div>
    </div>
  );

  const FriendCard = ({ friend, posKey }) => (
    <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 group">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-bold text-xl text-slate-800 tracking-tight">
            {friend.name}
          </h3>
          <div className="flex gap-1.5 flex-wrap mt-2">
            {friend.positions.map((p) => (
              <span
                key={p}
                className={`text-xs px-2.5 py-1 rounded-md font-bold transition-colors ${p === posKey ? "bg-emerald-500 text-white shadow-sm" : "bg-slate-100 text-slate-500"}`}
              >
                {p}
              </span>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          {confirmDeleteId === friend.id ? (
            <div className="flex items-center gap-2 bg-red-50/80 p-1.5 rounded-xl border border-red-100 animate-fade-in">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="text-slate-600 text-xs px-3 py-1.5 bg-white rounded-lg border border-slate-200 font-medium hover:bg-slate-50"
              >
                取消
              </button>
              <button
                onClick={() => handleDeleteFriend(friend.id)}
                className="text-white text-xs px-3 py-1.5 bg-red-500 rounded-lg font-bold shadow-sm shadow-red-500/20 hover:bg-red-600"
              >
                刪除
              </button>
            </div>
          ) : (
            <div className="opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
              <button
                onClick={() => openEditForm(friend)}
                className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors"
              >
                <Edit2 size={18} />
              </button>
              <button
                onClick={() => setConfirmDeleteId(friend.id)}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-50">
        {customFields.map((field) => {
          const val = friend.attributes[field.id];
          if (val === undefined || val === "") return null;
          if (field.type === "rating") {
            return (
              <div
                key={field.id}
                className="bg-slate-50/80 p-2.5 rounded-2xl flex justify-between items-center text-sm border border-slate-100"
              >
                <span className="text-slate-500 flex items-center gap-1 font-medium">
                  <Star size={14} className="text-amber-400" /> {field.name}
                </span>
                <span className="font-bold text-slate-700">Lv.{val}</span>
              </div>
            );
          }
          if (field.type === "yesno" || field.type === "choice") {
            return (
              <div
                key={field.id}
                className="col-span-2 bg-slate-50/80 p-3 rounded-2xl text-sm border border-slate-100 flex justify-between items-center"
              >
                <span className="text-slate-500 font-medium">{field.name}</span>
                <span className="font-bold text-emerald-700 bg-emerald-100/50 px-3 py-1 rounded-lg text-xs">
                  {val}
                </span>
              </div>
            );
          }
          return (
            <div
              key={field.id}
              className="col-span-2 bg-slate-50/80 p-3 rounded-2xl text-sm border border-slate-100"
            >
              <span className="text-slate-400 text-xs block mb-1 font-medium">
                {field.name}
              </span>
              <span className="text-slate-700 font-medium">{val}</span>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans selection:bg-emerald-100 text-slate-800">
      {/* 玻璃擬物化 Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 pt-safe">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-extrabold flex items-center gap-2 bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-500">
            <span className="text-emerald-500">🏐</span> 排球圖鑑
          </h1>
          <div className="flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
            {user ? (
              isSyncing ? (
                <RefreshCw
                  size={14}
                  className="animate-spin text-emerald-500"
                />
              ) : (
                <Cloud size={14} className="text-emerald-500" />
              )
            ) : (
              <CloudOff size={14} className="text-red-400" />
            )}
            {user ? "雲端已連線" : "未連線"}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-6 pt-6 pb-32 md:pb-24">
        {/* ==================== 列表頁面 ==================== */}
        {activeTab === "list" && (
          <div className="animate-fade-in">
            {/* 搜尋與篩選 */}
            <div className="flex gap-3 mb-8">
              <div className="relative flex-1 group">
                <Search
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors"
                  size={20}
                />
                <input
                  type="text"
                  placeholder="搜尋姓名..."
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 transition-all text-slate-700 shadow-sm"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-5 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-sm border ${showFilters || filterPositions.length > 0 || Object.keys(filterRatings).length > 0 ? "bg-emerald-50 border-emerald-200 text-emerald-600" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700"}`}
              >
                <Filter size={20} />
              </button>
            </div>

            {/* 展開的篩選器 */}
            {showFilters && (
              <div className="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-100 mb-8 animate-fade-in">
                <div className="mb-6">
                  <label className="block font-bold text-slate-700 mb-3 text-sm tracking-wide">
                    包含位置
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {POSITIONS.map((pos) => (
                      <button
                        key={pos}
                        onClick={() =>
                          togglePosition(
                            pos,
                            filterPositions,
                            setFilterPositions,
                          )
                        }
                        className={`px-4 py-2 rounded-xl font-medium text-sm transition-all duration-300 border ${filterPositions.includes(pos) ? "bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"}`}
                      >
                        {pos}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {customFields
                    .filter((f) => f.type === "rating")
                    .map((field) => (
                      <div
                        key={`filter-${field.id}`}
                        className="bg-slate-50 p-4 rounded-2xl border border-slate-100"
                      >
                        <label className="flex justify-between text-slate-600 mb-2 font-medium text-sm">
                          <span>最低 {field.name}</span>
                          <span className="text-emerald-600 font-bold bg-emerald-100/50 px-2 rounded-md">
                            Lv. {filterRatings[field.id] || 1}
                          </span>
                        </label>
                        <input
                          type="range"
                          min="1"
                          max="5"
                          value={filterRatings[field.id] || 1}
                          onChange={(e) =>
                            setFilterRatings({
                              ...filterRatings,
                              [field.id]: Number(e.target.value),
                            })
                          }
                          className="w-full accent-emerald-500 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    ))}
                </div>
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => {
                      setFilterName("");
                      setFilterPositions([]);
                      setFilterRatings({});
                    }}
                    className="text-sm font-semibold text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    清除所有篩選條件
                  </button>
                </div>
              </div>
            )}

            {/* 球友列表 */}
            <div className="space-y-12">
              {filteredFriends.length === 0 ? (
                <div className="text-center py-20 text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200">
                  <Users size={48} className="mx-auto mb-4 text-slate-300" />
                  <p className="font-medium text-lg">找不到符合條件的球友</p>
                </div>
              ) : (
                POSITIONS.map((pos) => {
                  const playersInPos = filteredFriends.filter((f) =>
                    f.positions.includes(pos),
                  );
                  if (
                    filterPositions.length > 0 &&
                    !filterPositions.includes(pos)
                  )
                    return null;

                  return (
                    <div key={`section-${pos}`} className="animate-fade-in">
                      <div className="flex items-center justify-between mb-5 px-1">
                        <h3 className="font-extrabold text-2xl text-slate-800 flex items-center gap-3">
                          <span className="w-1.5 h-7 bg-emerald-500 rounded-full inline-block"></span>
                          {pos}
                        </h3>
                        <span className="bg-emerald-50 text-emerald-700 text-sm px-3 py-1 rounded-full font-bold border border-emerald-100">
                          {playersInPos.length} 人
                        </span>
                      </div>
                      {playersInPos.length === 0 ? (
                        <div className="text-slate-400 text-sm py-6 bg-white/50 rounded-3xl border border-dashed border-slate-200 text-center font-medium">
                          目前無 {pos} 球友
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                          {playersInPos.map((friend) => (
                            <FriendCard
                              key={`${pos}-${friend.id}`}
                              friend={friend}
                              posKey={pos}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ==================== 新增/編輯頁面 ==================== */}
        {activeTab === "form" && (
          <div className="max-w-2xl mx-auto animate-fade-in">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-extrabold text-slate-800">
                {formData.id ? "編輯球友資料" : "新增球友"}
              </h2>
              {formData.id && (
                <button
                  onClick={() => openAddForm()}
                  className="text-sm text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-full font-bold transition-colors"
                >
                  切換為新增
                </button>
              )}
            </div>
            <form onSubmit={handleSaveFriend} className="space-y-6">
              <div className="bg-white p-6 md:p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
                <div className="mb-6">
                  <label className="block font-bold text-slate-700 mb-2">
                    姓名 / 暱稱
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="輸入名字..."
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 transition-all text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-3">
                    場上位置 (可複選)
                  </label>
                  <div className="flex flex-wrap gap-2.5">
                    {POSITIONS.map((pos) => (
                      <button
                        key={pos}
                        type="button"
                        onClick={() =>
                          togglePosition(pos, formData.positions, (newPos) =>
                            setFormData({ ...formData, positions: newPos }),
                          )
                        }
                        className={`px-5 py-2.5 rounded-xl font-bold transition-all duration-300 border ${formData.positions.includes(pos) ? "bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300"}`}
                      >
                        {pos}
                      </button>
                    ))}
                  </div>
                  {formData.positions.length === 0 && (
                    <p className="text-red-500 text-sm font-medium mt-3 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full inline-block"></span>
                      請至少選擇一個位置
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-white p-6 md:p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
                <h3 className="font-bold text-lg text-slate-800 mb-6 border-b border-slate-100 pb-3">
                  進階資料
                </h3>
                {customFields.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-6 bg-slate-50 rounded-2xl">
                    目前沒有自訂欄位，可至設定頁新增
                  </p>
                ) : (
                  <div className="space-y-6">
                    {customFields.map((field, index) => (
                      <div
                        key={field.id}
                        className={
                          index !== customFields.length - 1
                            ? "border-b border-slate-100 pb-6"
                            : ""
                        }
                      >
                        {field.type === "rating" ? (
                          <RatingInput
                            label={field.name}
                            value={formData.attributes[field.id]}
                            onChange={(val) =>
                              setFormData({
                                ...formData,
                                attributes: {
                                  ...formData.attributes,
                                  [field.id]: val,
                                },
                              })
                            }
                          />
                        ) : field.type === "yesno" ? (
                          <div>
                            <label className="font-bold text-slate-700 flex items-center gap-2 mb-3">
                              <HelpCircle
                                size={18}
                                className="text-emerald-500"
                              />{" "}
                              {field.name}
                            </label>
                            <div className="flex gap-3">
                              {["是", "否", "不確定"].map((opt) => (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() =>
                                    setFormData({
                                      ...formData,
                                      attributes: {
                                        ...formData.attributes,
                                        [field.id]: opt,
                                      },
                                    })
                                  }
                                  className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all border ${formData.attributes[field.id] === opt ? "bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"}`}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : field.type === "choice" ? (
                          <div>
                            <label className="font-bold text-slate-700 flex items-center gap-2 mb-3">
                              <List size={18} className="text-emerald-500" />{" "}
                              {field.name}
                            </label>
                            <div className="flex flex-wrap gap-2.5">
                              {(field.options || []).map((opt) => (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() =>
                                    setFormData({
                                      ...formData,
                                      attributes: {
                                        ...formData.attributes,
                                        [field.id]: opt,
                                      },
                                    })
                                  }
                                  className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all border ${formData.attributes[field.id] === opt ? "bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300"}`}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <label className="font-bold text-slate-700 flex items-center gap-2 mb-3">
                              <AlignLeft size={18} className="text-slate-400" />{" "}
                              {field.name}
                            </label>
                            <input
                              type="text"
                              value={formData.attributes[field.id] || ""}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  attributes: {
                                    ...formData.attributes,
                                    [field.id]: e.target.value,
                                  },
                                })
                              }
                              placeholder={`輸入${field.name}...`}
                              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 transition-all text-slate-800"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={
                  !formData.name.trim() || formData.positions.length === 0
                }
                className="w-full bg-slate-800 text-white font-extrabold text-lg py-5 rounded-2xl shadow-[0_10px_25px_rgba(30,41,59,0.3)] hover:bg-slate-900 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none transition-all duration-300 transform active:scale-[0.98]"
              >
                {formData.id ? "儲存修改" : "新增至圖鑑"}
              </button>
            </form>
          </div>
        )}

        {/* ==================== 欄位設定頁面 ==================== */}
        {activeTab === "fields" && (
          <div className="max-w-2xl mx-auto animate-fade-in">
            <h2 className="text-3xl font-extrabold text-slate-800 mb-3">
              設定與雲端同步
            </h2>
            <p className="text-slate-500 mb-8 font-medium">
              客製化你的圖鑑欄位，或在其他裝置輸入你的 Sync ID。
            </p>

            {/* ====== 新增：跨裝置即時同步區塊 ====== */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 md:p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.1)] border border-slate-700 text-white mb-10">
              <h3 className="font-bold text-xl mb-6 flex items-center gap-2">
                <Cloud size={24} className="text-emerald-400" /> 雲端即時同步
              </h3>

              <div className="bg-slate-800/60 p-5 rounded-2xl border border-slate-700/50 mb-6">
                <h4 className="font-medium text-emerald-400 mb-3 text-sm">
                  你的專屬同步代碼 (Sync ID)
                </h4>
                <div className="flex items-center justify-between bg-slate-950 p-4 rounded-xl border border-slate-700">
                  <span className="text-3xl font-mono font-bold tracking-[0.2em] text-white pl-2">
                    {syncId}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(syncId);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-1 ${copied ? "bg-emerald-500 text-white" : "bg-slate-700 hover:bg-slate-600 text-white"}`}
                  >
                    {copied ? (
                      <>
                        <HelpCircle size={16} /> 已複製
                      </>
                    ) : (
                      <>
                        <Copy size={16} /> 複製
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-3 font-medium">
                  ✨
                  在其他手機或電腦的網頁輸入這組代碼，即可自動同步所有球友名單！(修改會雙向即時同步)
                </p>
              </div>

              <div className="bg-slate-800/60 p-5 rounded-2xl border border-slate-700/50">
                <h4 className="font-medium text-emerald-400 mb-3 text-sm">
                  切換 / 載入其他同步代碼
                </h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputSyncId}
                    onChange={(e) =>
                      setInputSyncId(e.target.value.toUpperCase())
                    }
                    placeholder="輸入 6 碼 Sync ID..."
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-5 py-3 text-white outline-none focus:border-emerald-500 font-mono text-lg uppercase tracking-widest placeholder:text-slate-600 placeholder:tracking-normal"
                    maxLength={6}
                  />
                  <button
                    onClick={handleSwitchSyncId}
                    disabled={inputSyncId.length !== 6}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-6 py-3 rounded-xl font-bold transition-colors"
                  >
                    切換
                  </button>
                </div>
              </div>
            </div>

            <div className="h-px bg-slate-200 w-full mb-10"></div>

            <form
              onSubmit={handleAddField}
              className="bg-white p-6 md:p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 mb-10"
            >
              <h3 className="font-bold text-emerald-600 mb-5 flex items-center gap-2 text-lg">
                <div className="p-1.5 bg-emerald-100 rounded-lg">
                  <Plus size={18} />
                </div>{" "}
                新增項目欄位
              </h3>
              <div className="flex flex-col gap-4">
                <input
                  type="text"
                  required
                  placeholder="輸入欄位名稱 (例如：身高、發球)"
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  className="px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 text-slate-800 transition-all"
                />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { id: "rating", icon: Star, label: "1-5 評分" },
                    { id: "text", icon: Type, label: "文字輸入" },
                    { id: "yesno", icon: HelpCircle, label: "是非題" },
                    { id: "choice", icon: List, label: "選擇題" },
                  ].map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setNewFieldType(type.id)}
                      className={`py-3 rounded-xl font-bold text-sm flex flex-col items-center justify-center gap-2 transition-all border ${newFieldType === type.id ? "bg-emerald-50 text-emerald-600 border-emerald-400 shadow-sm" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"}`}
                    >
                      <type.icon size={20} /> {type.label}
                    </button>
                  ))}
                </div>
                {newFieldType === "choice" && (
                  <input
                    type="text"
                    required
                    placeholder="輸入選項，請用逗號分隔 (例: A,B,C)"
                    value={newFieldOptions}
                    onChange={(e) => setNewFieldOptions(e.target.value)}
                    className="px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 text-slate-800 transition-all animate-fade-in"
                  />
                )}
                <button
                  type="submit"
                  className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-bold shadow-md shadow-emerald-600/20 transition-colors"
                >
                  加入新欄位
                </button>
              </div>
            </form>

            <div>
              <h3 className="font-bold text-slate-800 mb-4 text-xl">
                目前的欄位清單
              </h3>
              <div className="space-y-4">
                {customFields.map((field, index) => (
                  <div
                    key={field.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragEnter={(e) => handleDragEnter(e, index)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`flex justify-between items-center bg-white p-4 rounded-2xl border shadow-sm transition-all duration-200 ${draggedIdx === index ? "opacity-40 border-emerald-500 scale-[0.98]" : dragOverIdx === index ? "border-emerald-500 border-dashed bg-emerald-50" : "border-slate-200 hover:border-slate-300"}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-emerald-500 py-2">
                        <GripVertical size={20} />
                      </div>
                      <div
                        className={`p-3 rounded-xl ${field.type === "rating" ? "bg-amber-100 text-amber-600" : field.type === "text" ? "bg-blue-100 text-blue-600" : field.type === "yesno" ? "bg-emerald-100 text-emerald-600" : "bg-purple-100 text-purple-600"}`}
                      >
                        {field.type === "rating" ? (
                          <Star size={20} />
                        ) : field.type === "text" ? (
                          <AlignLeft size={20} />
                        ) : field.type === "yesno" ? (
                          <HelpCircle size={20} />
                        ) : (
                          <List size={20} />
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 text-lg">
                          {field.name}
                        </div>
                        <div className="text-xs font-medium text-slate-400 mt-0.5">
                          {field.type === "rating"
                            ? "1-5 評分"
                            : field.type === "text"
                              ? "自由文字輸入"
                              : field.type === "yesno"
                                ? "是非題 (是/否/不確定)"
                                : `選擇題 (${field.options?.join(", ")})`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="hidden md:flex flex-col gap-1 mr-2">
                        <button
                          type="button"
                          onClick={() => moveField(index, "up")}
                          disabled={index === 0}
                          className="p-1 text-slate-400 hover:text-emerald-600 disabled:opacity-20 transition-colors"
                        >
                          <ArrowUp size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveField(index, "down")}
                          disabled={index === customFields.length - 1}
                          className="p-1 text-slate-400 hover:text-emerald-600 disabled:opacity-20 transition-colors"
                        >
                          <ArrowDown size={16} />
                        </button>
                      </div>
                      <div className="h-8 w-px bg-slate-100 mx-2 hidden md:block"></div>
                      <button
                        onClick={() => handleDeleteField(field.id)}
                        className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                ))}
                {customFields.length === 0 && (
                  <div className="text-center bg-slate-50 border border-dashed border-slate-200 rounded-3xl py-12">
                    <p className="text-slate-400 font-medium">
                      目前沒有自訂欄位
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ==================== 浮動 / 固定 導覽列 ==================== */}
      <nav
        className={`fixed z-50 flex overflow-hidden transition-all duration-300 select-none bottom-0 left-0 w-full bg-white/90 backdrop-blur-xl border-t border-slate-200 pb-safe md:bottom-10 md:right-10 md:left-auto md:w-auto md:border md:rounded-3xl md:shadow-[0_10px_40px_rgba(0,0,0,0.12)] md:pb-0`}
        style={
          window.innerWidth >= 768 && (navPos.x !== 0 || navPos.y !== 0)
            ? { transform: `translate(${navPos.x}px, ${navPos.y}px)` }
            : {}
        }
      >
        <div
          className="hidden md:flex items-center justify-center px-4 cursor-grab active:cursor-grabbing hover:bg-slate-50 text-slate-400 hover:text-slate-600 border-r border-slate-100 transition-colors"
          onMouseDown={handleNavMouseDown}
        >
          <GripVertical size={24} />
        </div>
        <div className="flex flex-1 md:flex-none">
          {[
            { id: "list", icon: Users, label: "球友列表" },
            {
              id: "form",
              icon: formData.id && activeTab === "form" ? Edit2 : UserPlus,
              label:
                formData.id && activeTab === "form" ? "編輯中" : "新增球友",
            },
            { id: "fields", icon: Settings, label: "欄位設定" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id === "form" && activeTab !== "form") openAddForm();
                else setActiveTab(tab.id);
              }}
              className={`flex-1 md:flex-none md:w-28 py-3.5 md:py-4 flex flex-col items-center gap-1.5 transition-all duration-300 relative ${activeTab === tab.id ? "text-emerald-600" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50/50"}`}
            >
              <div
                className={`transition-transform duration-300 ${activeTab === tab.id ? "scale-110" : "scale-100"}`}
              >
                <tab.icon
                  size={22}
                  strokeWidth={activeTab === tab.id ? 2.5 : 2}
                />
              </div>
              <span className="text-[11px] font-bold tracking-wide">
                {tab.label}
              </span>
              {activeTab === tab.id && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1 bg-emerald-500 rounded-b-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
              )}
            </button>
          ))}
        </div>
      </nav>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .pb-safe { padding-bottom: env(safe-area-inset-bottom, 0px); }
        .pt-safe { padding-top: env(safe-area-inset-top, 0px); }
      `,
        }}
      />
    </div>
  );
}
