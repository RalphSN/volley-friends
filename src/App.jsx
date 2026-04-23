import React, { useState, useMemo, useEffect, useRef } from "react";
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
  HelpCircle,
  List,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Copy,
  Cloud,
  CloudOff,
  RefreshCw,
  CheckCircle2,
  Hash,
  ExternalLink,
  ArrowUpDown,
  CheckSquare,
  LogOut,
  LogIn,
  User,
  Mail,
  Lock,
  AlertCircle,
  DownloadCloud,
  X,
  Share2,
  FileJson,
  UploadCloud,
  XCircle,
  ChevronDown,
  Phone,
  Smartphone,
  Tags,
} from "lucide-react";

// 引入 Firebase 模組
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updatePassword,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
} from "firebase/firestore";

// ====== Firebase 初始化設定 ======
const fallbackConfig = {
  apiKey: "AIzaSyAOr2Lvm0XcHqD4Huct8HW08LltduIBALM",
  authDomain: "volley-friends-db.firebaseapp.com",
  projectId: "volley-friends-db",
  storageBucket: "volley-friends-db.firebasestorage.app",
  messagingSenderId: "159697430554",
  appId: "1:159697430554:web:137c7c222dcade938649a3",
  measurementId: "G-H9D19XD0L7",
};

const firebaseConfig =
  typeof __firebase_config !== "undefined"
    ? JSON.parse(__firebase_config)
    : fallbackConfig;
const appId = typeof __app_id !== "undefined" ? __app_id : "volley-friends";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 常數定義
const POSITIONS = ["舉球", "主攻", "副攻", "攔中", "自由"];

// 高級感彩虹色調色盤 (低飽和度粉色系)
const GROUP_COLORS = {
  red: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  orange: {
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-200",
  },
  yellow: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
  },
  green: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
  },
  blue: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  purple: {
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    border: "border-indigo-200",
  },
  gray: {
    bg: "bg-slate-50",
    text: "text-slate-700",
    border: "border-slate-200",
  },
};

const getIconPrefix = (platformId) => {
  if (platformId === "ig") return "instagram";
  if (platformId === "fb") return "facebook";
  if (platformId === "line") return "line";
  if (platformId === "phone") return "phone";
  return "phone"; // fallback
};

// 新帳號預設會給予的基礎欄位模板
const INITIAL_CUSTOM_FIELDS = [
  { id: "skill", name: "程度", type: "rating" },
  { id: "comp", name: "勝負欲", type: "rating" },
  { id: "friendliness", name: "友善度", type: "rating" },
  { id: "available", name: "好揪度", type: "rating" },
  { id: "height", name: "身高 (cm)", type: "number" },
  { id: "contact", name: "聯絡方式", type: "contact" },
  {
    id: "orientation",
    name: "性傾向",
    type: "choice",
    options: ["同性戀", "異性戀", "雙性戀", "其他"],
    isMulti: false,
  },
  {
    id: "gender",
    name: "生理性別",
    type: "choice",
    options: ["男性", "女性", "跨性別", "其他"],
    isMulti: false,
  },
  {
    id: "goodAt",
    name: "擅長網高",
    type: "choice",
    options: ["男網", "女網", "混排女網"],
    isMulti: true,
  },
  { id: "note", name: "備註", type: "text" },
];

export default function App() {
  // ====== 全域 Toast 系統 ======
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success", // 'success' | 'error' | 'warning'
  });
  const toastTimeout = useRef(null);

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 3000);
  };

  // ====== 驗證與使用者狀態 ======
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // 表單與載入狀態
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [authForm, setAuthForm] = useState({
    email: "",
    password: "",
    nickname: "",
  });
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const [profileForm, setProfileForm] = useState({
    nickname: "",
    newPassword: "",
  });

  useEffect(() => {
    if (profile) {
      setProfileForm((prev) => ({ ...prev, nickname: profile.nickname || "" }));
    }
  }, [profile]);

  // ====== 雲端同步與資料狀態 ======
  const [isSyncing, setIsSyncing] = useState(true);
  const [importCode, setImportCode] = useState("");
  const [importConfirm, setImportConfirm] = useState(false);

  const [activeTab, setActiveTab] = useState("list");
  const [friends, setFriends] = useState([]);
  const [groups, setGroups] = useState([]); // 新增群組狀態
  const [customFields, setCustomFields] = useState([]);

  // ====== Lightbox Modal 狀態 ======
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const fileInputRef = useRef(null);

  // ====== 群組設定與表單狀態 ======
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupColor, setNewGroupColor] = useState("gray");
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [isManagingGroups, setIsManagingGroups] = useState(false);

  // ====== 欄位設定 ======
  const [editingFieldId, setEditingFieldId] = useState(null);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState("rating");
  const [newFieldOptions, setNewFieldOptions] = useState("");
  const [isMultiChoice, setIsMultiChoice] = useState(false);

  // ====== 導覽列拖曳 ======
  const [navPos, setNavPos] = useState({ x: 0, y: 0 });
  const [isDraggingNav, setIsDraggingNav] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // 1. 監聽登入狀態
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const profileRef = doc(
          db,
          "artifacts",
          appId,
          "users",
          currentUser.uid,
          "profile",
          "info",
        );
        try {
          const profileSnap = await getDoc(profileRef);
          if (profileSnap.exists()) setProfile(profileSnap.data());
        } catch (e) {
          console.error("無法取得個人資料", e);
        }
      } else {
        setProfile(null);
        setFriends([]);
        setGroups([]);
        setCustomFields([]);
        setIsSyncing(true);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. 即時監聽該帳號的球友資料
  useEffect(() => {
    if (!user) return;
    const docRef = doc(
      db,
      "artifacts",
      appId,
      "users",
      user.uid,
      "roster",
      "data",
    );
    setIsSyncing(true);

    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();

          // ====== 自動資料遷移 ======
          let needsMigration = false;
          let migratedFields = [...(data.customFields || [])];
          let migratedFriends = [...(data.friends || [])];
          let migratedGroups = [...(data.groups || [])];

          // 1. 更新舊的欄位選項設定
          migratedFields = migratedFields.map((field) => {
            if (field.id === "orientation") {
              let newOptions = [...(field.options || [])];
              let changed = false;
              if (newOptions.includes("不確定")) {
                newOptions = newOptions.map((opt) =>
                  opt === "不確定" ? "其他" : opt,
                );
                changed = true;
              }
              if (newOptions.includes("第三性")) {
                newOptions = newOptions.filter((opt) => opt !== "第三性");
                if (!newOptions.includes("其他")) newOptions.push("其他");
                changed = true;
              }
              if (changed) {
                needsMigration = true;
                return { ...field, options: newOptions };
              }
            }
            if (
              field.id === "gender" &&
              !field.options?.includes("其他") &&
              field.options?.includes("男性")
            ) {
              needsMigration = true;
              return { ...field, options: [...field.options, "其他"] };
            }
            if (field.id === "goodAt" && field.options?.includes("混合網")) {
              needsMigration = true;
              return {
                ...field,
                options: field.options.map((opt) =>
                  opt === "混合網" ? "混排女網" : opt,
                ),
              };
            }
            return field;
          });

          // 2. 幫球員舊資料替換成新選項文字與補充初始 groupIds
          migratedFriends = migratedFriends.map((friend) => {
            let newAttrs = { ...friend.attributes };
            let friendChanged = false;

            // 初始化 groupIds 防止未定義錯誤
            if (!friend.groupIds) {
              friendChanged = true;
            }

            if (
              newAttrs.orientation === "不確定" ||
              newAttrs.orientation === "第三性"
            ) {
              newAttrs.orientation = "其他";
              friendChanged = true;
            }
            if (
              Array.isArray(newAttrs.goodAt) &&
              newAttrs.goodAt.includes("混合網")
            ) {
              newAttrs.goodAt = newAttrs.goodAt.map((opt) =>
                opt === "混合網" ? "混排女網" : opt,
              );
              friendChanged = true;
            }

            return friendChanged || !friend.groupIds
              ? {
                  ...friend,
                  attributes: newAttrs,
                  groupIds: friend.groupIds || [],
                }
              : friend;
          });

          if (
            migratedFriends.some(
              (f) => f !== data.friends?.find((x) => x.id === f.id),
            )
          ) {
            needsMigration = true;
          }

          // 3. 如果有修改，自動寫回雲端覆蓋舊資料
          if (needsMigration) {
            setDoc(
              docRef,
              {
                friends: migratedFriends,
                customFields: migratedFields,
                groups: migratedGroups,
              },
              { merge: true },
            ).catch((err) => console.error("資料升級失敗:", err));
          }

          setFriends(migratedFriends);
          setCustomFields(migratedFields);
          setGroups(migratedGroups);
        } else {
          setFriends([]);
          setGroups([]);
          setCustomFields(INITIAL_CUSTOM_FIELDS);
          setDoc(docRef, {
            friends: [],
            groups: [],
            customFields: INITIAL_CUSTOM_FIELDS,
          });
        }
        setIsSyncing(false);
      },
      (error) => {
        console.error("讀取資料失敗:", error);
        setIsSyncing(false);
      },
    );

    return () => unsubscribe();
  }, [user]);

  // ====== 登入 / 註冊邏輯 ======
  const generateShareCode = () =>
    Math.random().toString(36).substring(2, 8).toUpperCase();

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setIsAuthenticating(true);
    try {
      if (isLoginMode) {
        await signInWithEmailAndPassword(
          auth,
          authForm.email,
          authForm.password,
        );
        showToast("登入成功！", "success");
      } else {
        if (!authForm.nickname.trim()) throw new Error("請輸入暱稱");
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          authForm.email,
          authForm.password,
        );
        const newUid = userCredential.user.uid;
        const newShareCode = generateShareCode();

        await setDoc(
          doc(db, "artifacts", appId, "users", newUid, "profile", "info"),
          {
            nickname: authForm.nickname.trim(),
            email: authForm.email,
            shareCode: newShareCode,
          },
        );
        await setDoc(
          doc(
            db,
            "artifacts",
            appId,
            "public",
            "data",
            "shareCodes",
            newShareCode,
          ),
          { uid: newUid },
        );
        await setDoc(
          doc(db, "artifacts", appId, "users", newUid, "roster", "data"),
          {
            friends: [],
            groups: [],
            customFields: INITIAL_CUSTOM_FIELDS,
          },
        );
        showToast("註冊成功，歡迎加入！", "success");
      }
    } catch (err) {
      let msg = "發生未知的錯誤，請重試";
      if (err.message.includes("auth/invalid-email")) msg = "信箱格式錯誤";
      else if (err.message.includes("auth/user-not-found"))
        msg = "找不到此帳號";
      else if (
        err.message.includes("auth/wrong-password") ||
        err.message.includes("auth/invalid-credential")
      )
        msg = "密碼錯誤";
      else if (err.message.includes("auth/email-already-in-use"))
        msg = "此信箱已註冊過";
      else if (err.message.includes("auth/weak-password"))
        msg = "密碼長度需至少 6 個字元";
      showToast(msg, "error");
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleResetPassword = async () => {
    if (!authForm.email) {
      showToast("請先在上方輸入您的電子信箱", "error");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, authForm.email);
      showToast("密碼重設信件已寄出，請前往信箱收信！", "success");
    } catch (err) {
      showToast("寄送失敗，請確認信箱是否正確或已經註冊。", "error");
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    try {
      if (
        profileForm.nickname.trim() &&
        profileForm.nickname !== profile.nickname
      ) {
        await setDoc(
          doc(db, "artifacts", appId, "users", user.uid, "profile", "info"),
          {
            ...profile,
            nickname: profileForm.nickname.trim(),
          },
        );
        setProfile((prev) => ({
          ...prev,
          nickname: profileForm.nickname.trim(),
        }));
      }
      if (profileForm.newPassword) {
        if (profileForm.newPassword.length < 6)
          throw new Error("密碼長度需至少 6 個字元");
        await updatePassword(user, profileForm.newPassword);
        setProfileForm((prev) => ({ ...prev, newPassword: "" }));
      }
      showToast("會員資料更新成功！", "success");
    } catch (err) {
      if (err.message.includes("requires-recent-login")) {
        showToast("為確保安全，更改密碼需重新登入，請先登出後再試。", "error");
      } else {
        showToast(err.message || "更新失敗，請稍後再試。", "error");
      }
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleLogout = () => {
    signOut(auth);
    setActiveTab("list");
    showToast("已成功登出", "success");
  };

  // 加上群組參數
  const updateCloudData = async (newFriends, newFields, newGroups = groups) => {
    if (!user) return;
    try {
      const docRef = doc(
        db,
        "artifacts",
        appId,
        "users",
        user.uid,
        "roster",
        "data",
      );
      await setDoc(docRef, {
        friends: newFriends,
        customFields: newFields,
        groups: newGroups,
      });
    } catch (e) {
      showToast("儲存失敗，請檢查網路連線", "error");
    }
  };

  // ====== 資料分享與備份 ======
  const handleImportByCode = async () => {
    if (!importCode || importCode.length !== 6) return;
    setIsImporting(true);
    try {
      const codeRef = doc(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "shareCodes",
        importCode.toUpperCase(),
      );
      const codeSnap = await getDoc(codeRef);

      if (!codeSnap.exists()) {
        showToast("找不到此分享代碼！", "error");
        setImportConfirm(false);
        return;
      }

      const targetUid = codeSnap.data().uid;
      if (targetUid === user.uid) {
        showToast("不能匯入自己的代碼哦！", "error");
        setImportConfirm(false);
        return;
      }

      const rosterRef = doc(
        db,
        "artifacts",
        appId,
        "users",
        targetUid,
        "roster",
        "data",
      );
      const rosterSnap = await getDoc(rosterRef);

      if (rosterSnap.exists()) {
        const data = rosterSnap.data();
        await updateCloudData(
          data.friends || [],
          data.customFields || [],
          data.groups || [],
        );
        showToast("雲端資料匯入成功！已覆蓋現有圖鑑。", "success");
        setImportCode("");
        setImportConfirm(false);
      } else {
        showToast("該帳號目前沒有建立資料。", "error");
        setImportConfirm(false);
      }
    } catch (err) {
      showToast("匯入失敗，請確認權限或稍後再試。", "error");
      setImportConfirm(false);
    } finally {
      setIsImporting(false);
    }
  };

  const handleCopyCode = () => {
    if (!profile?.shareCode) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(profile.shareCode);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = profile.shareCode;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        textArea.remove();
      }
      showToast("分享代碼已複製！", "success");
    } catch (err) {
      showToast("複製失敗", "error");
    }
  };

  // JSON 匯出
  const handleExportJson = () => {
    const data = {
      version: 1,
      exportDate: new Date().toISOString(),
      customFields,
      groups,
      friends,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `volley-friends-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("JSON 備份檔匯出成功！", "success");
  };

  // JSON 匯入邏輯
  const processFileImport = async (file) => {
    if (
      !file ||
      (file.type !== "application/json" && !file.name.endsWith(".json"))
    ) {
      showToast("請選擇 .json 格式的檔案", "error");
      return;
    }
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      let importedFriends = [];
      let importedFields = customFields;
      let importedGroups = groups;

      if (Array.isArray(data)) {
        importedFriends = data;
      } else if (data.friends && Array.isArray(data.friends)) {
        importedFriends = data.friends;
        if (data.customFields && Array.isArray(data.customFields)) {
          importedFields = data.customFields;
        }
        if (data.groups && Array.isArray(data.groups)) {
          importedGroups = data.groups;
        }
      } else {
        throw new Error("格式錯誤");
      }

      importedFriends = importedFriends.map((f) => ({
        ...f,
        id:
          f.id ||
          Date.now().toString() + Math.random().toString(36).substr(2, 5),
        name: f.name || "未命名球友",
        positions: Array.isArray(f.positions) ? f.positions : [],
        groupIds: Array.isArray(f.groupIds) ? f.groupIds : [],
        attributes: f.attributes || {},
      }));

      await updateCloudData(importedFriends, importedFields, importedGroups);
      setFriends(importedFriends);
      setCustomFields(importedFields);
      setGroups(importedGroups);
      showToast("JSON 檔案匯入成功！已覆蓋資料", "success");
    } catch (e) {
      showToast("檔案讀取失敗，請確認是否為有效的 JSON 格式", "error");
    }
  };

  const handleDropFile = (e) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files[0];
    processFileImport(file);
  };

  // ====== 畫面與表單狀態 ======
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeTab]);

  const [formData, setFormData] = useState({
    id: null,
    name: "",
    positions: [],
    groupIds: [],
    attributes: {},
  });
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // ====== 篩選與排序 ======
  const [filterName, setFilterName] = useState("");
  const [filterPositions, setFilterPositions] = useState([]);
  const [filterGroups, setFilterGroups] = useState([]);
  const [filterValues, setFilterValues] = useState({});
  const [sortBy, setSortBy] = useState("skill");

  // 計算是否啟用篩選
  const activeFiltersCount =
    filterPositions.length +
    filterGroups.length +
    Object.keys(filterValues).length +
    (sortBy !== "skill" && sortBy !== "" ? 1 : 0);

  // ====== 互動處理邏輯 ======
  const handleSaveFriend = async (e, isModal = false) => {
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

    if (isModal) {
      setIsEditModalOpen(false);
    } else {
      setActiveTab("list");
    }
    showToast(formData.id ? "資料修改成功！" : "新增球友成功！", "success");
    await updateCloudData(newFriends, customFields, groups);
  };

  const handleDeleteFriend = async (id) => {
    const newFriends = friends.filter((f) => f.id !== id);
    setFriends(newFriends);
    setConfirmDeleteId(null);
    setSelectedFriend(null);
    setIsEditModalOpen(false);
    showToast("已刪除該球友", "success");
    await updateCloudData(newFriends, customFields, groups);
  };

  // ----- 群組 CRUD -----
  const handleSaveGroup = async (e) => {
    if (e) e.preventDefault();
    if (!newGroupName.trim()) return;

    const newId = editingGroupId || Date.now().toString();
    const groupData = {
      id: newId,
      name: newGroupName.trim().substring(0, 6),
      color: newGroupColor,
    };

    let newGroups;
    if (editingGroupId) {
      newGroups = groups.map((g) => (g.id === editingGroupId ? groupData : g));
    } else {
      newGroups = [...groups, groupData];
    }

    // 自動為當前正在編輯的球員勾選這個新標籤 (若不超過上限)
    if (!editingGroupId) {
      const currentIds = formData.groupIds || [];
      if (currentIds.length >= 2) {
        showToast("群組新增成功！(已達 2 個上限，未自動套用)", "warning");
      } else {
        setFormData((prev) => ({
          ...prev,
          groupIds: [...currentIds, newId],
        }));
        showToast("群組新增成功！", "success");
      }
    } else {
      showToast("群組更新成功！", "success");
    }

    setGroups(newGroups);
    setEditingGroupId(null);
    setNewGroupName("");
    setNewGroupColor("gray");
    await updateCloudData(friends, customFields, newGroups);
  };

  const handleDeleteGroup = async (groupId) => {
    const newGroups = groups.filter((g) => g.id !== groupId);
    // Remove group from all friends
    const newFriends = friends.map((f) => {
      if (f.groupIds && f.groupIds.includes(groupId)) {
        return { ...f, groupIds: f.groupIds.filter((id) => id !== groupId) };
      }
      return f;
    });

    // 移除當前表單中被刪除的標籤
    if (formData.groupIds?.includes(groupId)) {
      setFormData((prev) => ({
        ...prev,
        groupIds: prev.groupIds.filter((id) => id !== groupId),
      }));
    }

    // 移除篩選條件中被刪除的標籤
    if (filterGroups.includes(groupId)) {
      setFilterGroups((prev) => prev.filter((id) => id !== groupId));
    }

    setGroups(newGroups);
    setFriends(newFriends);
    showToast("群組已刪除", "success");
    await updateCloudData(newFriends, customFields, newGroups);
  };

  // ----- 欄位 CRUD -----
  const handleEditField = (field) => {
    setEditingFieldId(field.id);
    setNewFieldName(field.name);
    setNewFieldType(field.type);
    setNewFieldOptions(field.options ? field.options.join(", ") : "");
    setIsMultiChoice(field.isMulti || false);
  };

  const cancelEditField = () => {
    setEditingFieldId(null);
    setNewFieldName("");
    setNewFieldType("rating");
    setNewFieldOptions("");
    setIsMultiChoice(false);
  };

  const handleSaveField = async (e) => {
    e.preventDefault();
    if (!newFieldName.trim()) return;

    const newField = {
      id: editingFieldId || Date.now().toString(),
      name: newFieldName.trim(),
      type: newFieldType,
    };

    if (newFieldType === "choice") {
      if (!newFieldOptions.trim()) return;
      newField.options = newFieldOptions
        .split(/[,，]/)
        .map((opt) => opt.trim())
        .filter(Boolean);
      newField.isMulti = isMultiChoice;
    }

    let newFields;
    const noteField = customFields.find((f) => f.id === "note");
    const otherFields = customFields.filter((f) => f.id !== "note");

    if (editingFieldId) {
      const updatedOthers = otherFields.map((f) =>
        f.id === editingFieldId ? newField : f,
      );
      newFields = [...updatedOthers, noteField].filter(Boolean);
    } else {
      newFields = [...otherFields, newField, noteField].filter(Boolean);
    }

    setCustomFields(newFields);
    cancelEditField();
    showToast(editingFieldId ? "欄位更新成功！" : "欄位新增成功！", "success");
    await updateCloudData(friends, newFields, groups);
  };

  const handleDeleteField = async (fieldId) => {
    if (fieldId === "note") return;
    const newFields = customFields.filter((f) => f.id !== fieldId);
    const newFriends = friends.map((friend) => {
      const newAttributes = { ...friend.attributes };
      delete newAttributes[fieldId];
      return { ...friend, attributes: newAttributes };
    });
    setCustomFields(newFields);
    setFriends(newFriends);
    showToast("欄位已刪除", "success");
    await updateCloudData(newFriends, newFields, groups);
  };

  const [draggedIdx, setDraggedIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);

  const editableFields = customFields.filter((f) => f.id !== "note");
  const noteField = customFields.find((f) => f.id === "note");

  const handleDragStart = (e, index) => setDraggedIdx(index);
  const handleDragEnter = (e, index) => {
    e.preventDefault();
    setDragOverIdx(index);
  };
  const handleDragOver = (e) => e.preventDefault();

  const handleDrop = async (e, index) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === index) return;

    const newEditable = [...editableFields];
    const draggedItem = newEditable[draggedIdx];
    newEditable.splice(draggedIdx, 1);
    newEditable.splice(index, 0, draggedItem);

    const newFields = [...newEditable, noteField].filter(Boolean);
    setCustomFields(newFields);
    setDraggedIdx(null);
    setDragOverIdx(null);
    await updateCloudData(friends, newFields, groups);
  };
  const handleDragEnd = () => {
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const moveField = async (index, direction) => {
    const newEditable = [...editableFields];
    if (direction === "up" && index > 0) {
      [newEditable[index - 1], newEditable[index]] = [
        newEditable[index],
        newEditable[index - 1],
      ];
    } else if (direction === "down" && index < newEditable.length - 1) {
      [newEditable[index + 1], newEditable[index]] = [
        newEditable[index],
        newEditable[index + 1],
      ];
    }
    const newFields = [...newEditable, noteField].filter(Boolean);
    setCustomFields(newFields);
    await updateCloudData(friends, newFields, groups);
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

  const getInitialAttributeValue = (field) => {
    if (field.type === "rating") return null;
    if (field.type === "choice" && field.isMulti) return [];
    if (field.type === "contact") return { platform: "ig", id: "" };
    return "";
  };

  const openAddForm = () => {
    const initialAttributes = {};
    customFields.forEach((f) => {
      initialAttributes[f.id] = getInitialAttributeValue(f);
    });
    setFormData({
      id: null,
      name: "",
      positions: [],
      groupIds: [],
      attributes: initialAttributes,
    });
    setIsAddingGroup(false);
    setIsManagingGroups(false);
    setEditingGroupId(null);
    setNewGroupName("");
    setIsEditModalOpen(false);
    setActiveTab("form");
  };

  const openEditForm = (friend) => {
    const initialAttributes = { ...friend.attributes };
    customFields.forEach((f) => {
      if (initialAttributes[f.id] === undefined) {
        initialAttributes[f.id] = getInitialAttributeValue(f);
      }
    });
    setFormData({
      id: friend.id,
      name: friend.name,
      positions: [...friend.positions],
      groupIds: friend.groupIds ? [...friend.groupIds] : [],
      attributes: initialAttributes,
    });
    setIsAddingGroup(false);
    setIsManagingGroups(false);
    setEditingGroupId(null);
    setNewGroupName("");
    setSelectedFriend(null);
    setIsEditModalOpen(true);
  };

  const togglePosition = (pos, currentList, onChange) => {
    if (currentList.includes(pos))
      onChange(currentList.filter((p) => p !== pos));
    else onChange([...currentList, pos]);
  };

  const getContactWebLink = (contact) => {
    if (!contact || !contact.id) return "#";
    const id = contact.id.trim();
    switch (contact.platform) {
      case "ig":
        return `https://www.instagram.com/${id}`;
      case "fb":
        return `https://www.facebook.com/${id}`;
      case "line":
        return `https://line.me/ti/p/~${id}`;
      case "phone":
        return `tel:${id}`;
      default:
        return "#";
    }
  };

  const handleContactClick = (e, contact) => {
    if (!contact || !contact.id || contact.platform === "phone") return;

    // 判斷是否為行動裝置
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (!isMobile) return; // 桌面端維持預設 _blank 網頁跳轉行為

    e.preventDefault();
    e.stopPropagation();

    const id = contact.id.trim();
    const webUrl = getContactWebLink(contact);
    let appUrl = "";
    const isAndroid = /Android/i.test(navigator.userAgent);

    if (isAndroid) {
      // Android 使用 Intent URI 機制，由系統原生處理跳轉與 Fallback，不會殘留空分頁
      const fallbackStr = `;S.browser_fallback_url=${encodeURIComponent(webUrl)}`;
      if (contact.platform === "ig") {
        appUrl = `intent://instagram.com/_u/${id}/#Intent;package=com.instagram.android;scheme=https${fallbackStr};end`;
      } else if (contact.platform === "fb") {
        appUrl = `intent://profile/${id}#Intent;package=com.facebook.katana;scheme=fb${fallbackStr};end`;
      } else if (contact.platform === "line") {
        appUrl = `intent://ti/p/~${id}#Intent;package=jp.naver.line.android;scheme=line${fallbackStr};end`;
      }
      if (appUrl) window.location.href = appUrl;
      return;
    }

    // iOS 使用 Custom Scheme
    switch (contact.platform) {
      case "ig":
        appUrl = `instagram://user?username=${id}`;
        break;
      case "fb":
        appUrl = `fb://profile/${id}`;
        break;
      case "line":
        appUrl = `line://ti/p/~${id}`;
        break;
      default:
        return;
    }

    let timer;
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // 網頁進入背景（成功開啟 APP 或系統提示對話框時），清除計時器
        clearTimeout(timer);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    window.location.href = appUrl;

    // 若 2 秒後網頁仍在前景，表示未安裝 APP 或跳轉失敗，則同頁面跳轉至網頁版
    timer = setTimeout(() => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (!document.hidden) {
        window.location.href = webUrl;
      }
    }, 2000);
  };

  const filteredFriends = useMemo(() => {
    let result = friends.filter((friend) => {
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
      if (filterGroups.length > 0) {
        const friendGroups = friend.groupIds || [];
        const hasMatchingGroup = friendGroups.some((gid) =>
          filterGroups.includes(gid),
        );
        if (!hasMatchingGroup) return false;
      }
      for (const field of customFields) {
        const fVal = filterValues[field.id];
        if (fVal !== undefined && fVal !== null) {
          const friendVal = friend.attributes[field.id];
          if (field.type === "rating" && fVal > 1) {
            if (!friendVal || friendVal < fVal) return false;
          }
          if (
            (field.type === "choice" || field.type === "yesno") &&
            Array.isArray(fVal) &&
            fVal.length > 0
          ) {
            if (!friendVal) return false;
            const friendValArr = Array.isArray(friendVal)
              ? friendVal
              : [friendVal];
            const hasIntersection = friendValArr.some((v) => fVal.includes(v));
            if (!hasIntersection) return false;
          }
          if (field.type === "number" && fVal.value !== "") {
            const num = Number(friendVal);
            const target = Number(fVal.value);
            if (!isNaN(num) && !isNaN(target)) {
              if (fVal.op === ">=" && num < target) return false;
              if (fVal.op === "<=" && num > target) return false;
            } else if (friendVal === undefined || friendVal === "") {
              return false;
            }
          }
        }
      }
      return true;
    });

    if (sortBy) {
      result.sort((a, b) => {
        const field = customFields.find((f) => f.id === sortBy);
        let valA = a.attributes[sortBy];
        let valB = b.attributes[sortBy];
        if (field?.type === "rating" || field?.type === "number") {
          return Number(valB || 0) - Number(valA || 0);
        }
        return 0;
      });
    }
    return result;
  }, [
    friends,
    filterName,
    filterPositions,
    filterGroups,
    filterValues,
    sortBy,
    customFields,
  ]);

  // ====== 專屬客製化下拉選單 (通用) ======
  const CustomSelect = ({
    value,
    onChange,
    options,
    className = "",
    innerClassName = "",
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    const current = options.find((o) => o.value === value) || options[0];

    return (
      <div className={`relative ${className}`}>
        <div
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full h-full border border-slate-200 rounded-2xl px-4 py-3.5 text-sm text-slate-700 outline-none hover:border-emerald-400 font-medium cursor-pointer flex items-center justify-between transition-all shadow-sm gap-2 ${innerClassName || "bg-white"}`}
        >
          <span className="truncate">{current ? current.label : "請選擇"}</span>
          <ChevronDown
            size={16}
            className={`text-slate-400 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </div>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-[50]"
              onClick={() => setIsOpen(false)}
            ></div>
            <div className="absolute top-full left-0 mt-2 w-full min-w-[120px] bg-white border border-slate-100 shadow-[0_10px_40px_rgba(0,0,0,0.1)] rounded-2xl overflow-hidden z-[51] animate-fade-in">
              {options.map((opt) => (
                <div
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className="flex items-center px-4 py-3 hover:bg-emerald-50 cursor-pointer transition-colors border-b border-slate-50 last:border-0 text-sm font-medium text-slate-700"
                >
                  {opt.label}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  // ====== 專屬客製化下拉選單 (聯絡方式) ======
  const ContactSelect = ({ value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const platforms = [
      { id: "ig", label: "Instagram", prefix: "instagram" },
      { id: "fb", label: "Facebook", prefix: "facebook" },
      { id: "line", label: "LINE", prefix: "line" },
      { id: "phone", label: "手機號碼", prefix: "phone" },
    ];
    const current = platforms.find((p) => p.id === value) || platforms[0];

    return (
      <div className="relative shrink-0 w-[72px] sm:w-[150px]">
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="w-full h-full bg-white border border-slate-200 rounded-2xl px-2 sm:px-4 py-3.5 text-slate-700 outline-none hover:border-emerald-400 font-medium cursor-pointer flex items-center justify-between transition-all shadow-sm gap-1 sm:gap-2"
        >
          <div className="flex items-center gap-2 overflow-hidden mx-auto sm:mx-0">
            <div
              className={`w-6 h-6 flex items-center justify-center shrink-0`}
            >
              <img
                src={`src/assets/icons/${current.prefix}-p.svg`}
                alt={current.label}
                className="w-full h-full object-contain"
              />
            </div>
            <span className="hidden sm:block text-sm font-bold truncate">
              {current.label}
            </span>
          </div>
          <ChevronDown
            size={16}
            className={`text-slate-400 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </div>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-[50]"
              onClick={() => setIsOpen(false)}
            ></div>
            <div className="absolute top-full left-0 mt-2 w-40 sm:w-48 bg-white border border-slate-100 shadow-[0_10px_40px_rgba(0,0,0,0.1)] rounded-2xl overflow-hidden z-[51] animate-fade-in">
              {platforms.map((p) => (
                <div
                  key={p.id}
                  onClick={() => {
                    onChange(p.id);
                    setIsOpen(false);
                  }}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-emerald-50 cursor-pointer transition-colors border-b border-slate-50 last:border-0"
                >
                  <div
                    className={`w-6 h-6 flex items-center justify-center shrink-0`}
                  >
                    <img
                      src={`src/assets/icons/${p.prefix}-p.svg`}
                      alt={p.label}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <span className="font-bold text-slate-700 text-sm">
                    {p.label}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  // ====== UI 元件 ======
  const RatingInput = ({ label, value, onChange }) => (
    <div className="mb-5 animate-slide-up">
      <div className="flex justify-between items-center mb-3">
        <label className="font-semibold text-slate-700 flex items-center gap-2">
          <Star size={16} className="text-emerald-500" /> {label}
        </label>
        <span
          className={`text-sm font-bold px-3 py-1 rounded-full shadow-sm transition-colors ${value ? "text-emerald-600 bg-emerald-50" : "text-slate-400 bg-slate-100"}`}
        >
          {value ? `Lv. ${value}` : "未評分"}
        </span>
      </div>
      <div className="flex justify-between gap-2">
        {[1, 2, 3, 4, 5].map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => onChange(value === num ? null : num)}
            className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 transform active:scale-90 cursor-pointer ${
              value === num
                ? "bg-emerald-500 text-white shadow-[0_4px_12px_rgba(16,185,129,0.3)] border border-emerald-500 -translate-y-0.5"
                : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300"
            }`}
          >
            {num}
          </button>
        ))}
      </div>
    </div>
  );

  // 極簡版的卡片
  const FriendCard = ({ friend, posKey }) => {
    // 尋找要顯示的精簡欄位
    const orientationField = customFields.find(
      (f) => f.id === "orientation" || f.name.includes("性傾向"),
    );
    const genderField = customFields.find(
      (f) => f.id === "gender" || f.name.includes("性別"),
    );
    const heightField = customFields.find(
      (f) => f.id === "height" || f.name.includes("身高"),
    );
    const contactField = customFields.find((f) => f.type === "contact");

    const isRainbow =
      orientationField && friend.attributes[orientationField.id] === "同性戀";
    const genderVal = genderField ? friend.attributes[genderField.id] : null;
    const heightVal = heightField ? friend.attributes[heightField.id] : null;
    const contactVal = contactField ? friend.attributes[contactField.id] : null;

    const outerClass = isRainbow
      ? "relative p-[3px] rounded-3xl shadow-sm hover:shadow-[0_10px_40px_rgb(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 group cursor-pointer rainbow-border-animate"
      : "bg-white border border-slate-100 p-5 rounded-3xl shadow-sm hover:shadow-[0_10px_40px_rgb(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 group cursor-pointer";

    const innerClass = isRainbow
      ? "bg-white p-[17px] rounded-[calc(1.5rem-3px)] h-full w-full flex flex-col"
      : "h-full w-full flex flex-col";

    return (
      <div onClick={() => setSelectedFriend(friend)} className={outerClass}>
        <div className={innerClass}>
          {/* 第一排：姓名與操作按鈕 (獨立容器) */}
          <div className="flex justify-between items-start w-full">
            <h3 className="font-bold text-xl text-slate-800 tracking-tight group-hover:text-emerald-600 transition-colors truncate flex-1 min-w-0 pr-2">
              {friend.name}
            </h3>
            <div
              className="flex gap-2 shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              {confirmDeleteId === friend.id ? (
                <div className="flex items-center gap-2 bg-red-50/80 p-1.5 rounded-xl border border-red-100 animate-fade-in">
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="cursor-pointer text-slate-600 text-xs px-3 py-1.5 bg-white rounded-lg border border-slate-200 font-medium hover:bg-slate-50 active:scale-95 transition-transform"
                  >
                    取消
                  </button>
                  <button
                    onClick={() => handleDeleteFriend(friend.id)}
                    className="cursor-pointer text-white text-xs px-3 py-1.5 bg-red-500 rounded-lg font-bold shadow-sm shadow-red-500/20 hover:bg-red-600 active:scale-95 transition-transform"
                  >
                    刪除
                  </button>
                </div>
              ) : (
                <div className="opacity-100 md:opacity-0 group-hover:opacity-100 transition-all duration-300 flex gap-1 translate-x-2 md:translate-x-0">
                  <button
                    onClick={() => openEditForm(friend)}
                    className="cursor-pointer p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-all hover:rotate-12 active:scale-90"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(friend.id)}
                    className="cursor-pointer p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all hover:-rotate-12 active:scale-90"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 第二排：位置與群組標籤 (獨立容器、滿寬、不換行、尾部漸層遮罩) */}
          <div className="flex gap-1.5 flex-nowrap items-center mt-3 w-full overflow-hidden mask-fade-right pb-1 relative">
            {friend.positions.map((p) => (
              <span
                key={p}
                className={`shrink-0 text-xs px-2.5 py-1 rounded-md font-bold transition-colors shadow-sm ${
                  p === posKey
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {p}
              </span>
            ))}
            {friend.groupIds?.map((gid) => {
              const g = groups.find((x) => x.id === gid);
              if (!g) return null;
              const colors = GROUP_COLORS[g.color] || GROUP_COLORS.gray;
              return (
                <span
                  key={gid}
                  className={`shrink-0 text-xs px-2.5 py-1 rounded-md font-bold border shadow-sm ${colors.bg} ${colors.text} ${colors.border}`}
                >
                  {g.name}
                </span>
              );
            })}
          </div>

          {/* 第三排：精簡資訊區塊 */}
          <div className="flex items-center gap-3 mt-auto pt-4 border-t border-slate-50 text-sm w-full overflow-hidden">
            {genderVal && (
              <div className="text-slate-600 flex items-center gap-1 shrink-0">
                <User size={14} className="text-slate-400 shrink-0" />
                <span className="truncate">{genderVal}</span>
              </div>
            )}
            {heightVal && (
              <div className="text-slate-600 flex items-center gap-1 shrink-0">
                <Hash size={14} className="text-slate-400 shrink-0" />
                <span className="truncate">{heightVal} cm</span>
              </div>
            )}
            {contactVal && contactVal.id && (
              <div
                className="flex items-center min-w-0"
                onClick={(e) => e.stopPropagation()}
              >
                <a
                  href={getContactWebLink(contactVal)}
                  onClick={(e) => handleContactClick(e, contactVal)}
                  target="_blank"
                  rel="noreferrer"
                  title={contactVal.id}
                  className="flex items-center gap-1.5 bg-slate-50 hover:bg-emerald-50 px-2.5 py-1.5 rounded-lg transition-colors border border-slate-100 hover:border-emerald-200 min-w-0 max-w-full"
                >
                  <img
                    src={`src/assets/icons/${getIconPrefix(contactVal.platform)}-p.svg`}
                    alt={contactVal.platform}
                    className="w-4 h-4 shrink-0 object-contain"
                  />
                  <span className="text-slate-600 font-bold text-sm truncate leading-none">
                    {contactVal.id}
                  </span>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // 修改：升級為現代化 Shimmer (光澤掃過) 風格的 Skeleton 骨架屏卡片
  const SkeletonCard = () => (
    <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm h-full w-full">
      <div className="flex flex-col h-full w-full">
        {/* 第一排：姓名與按鈕 */}
        <div className="flex justify-between items-start w-full">
          <div className="h-7 w-1/2 rounded-lg shimmer-bg"></div>
          <div className="flex gap-2 shrink-0">
            <div className="h-9 w-9 rounded-full shimmer-bg"></div>
            <div className="h-9 w-9 rounded-full shimmer-bg"></div>
          </div>
        </div>

        {/* 第二排：標籤 (滿寬不換行) */}
        <div className="flex gap-2 flex-nowrap items-center mt-3 w-full overflow-hidden mask-fade-right pb-1">
          <div className="h-6 w-12 shrink-0 rounded-md shimmer-bg"></div>
          <div className="h-6 w-16 shrink-0 rounded-md shimmer-bg"></div>
          <div className="h-6 w-14 shrink-0 rounded-md shimmer-bg"></div>
          <div className="h-6 w-14 shrink-0 rounded-md shimmer-bg"></div>
        </div>

        {/* 第三排：精簡資訊 */}
        <div className="flex items-center gap-4 mt-auto pt-4 border-t border-slate-50 w-full overflow-hidden">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full shrink-0 shimmer-bg"></div>
            <div className="h-4 w-10 rounded-md shrink-0 shimmer-bg"></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full shrink-0 shimmer-bg"></div>
            <div className="h-4 w-12 rounded-md shrink-0 shimmer-bg"></div>
          </div>
          <div className="h-8 w-24 rounded-lg ml-auto shimmer-bg"></div>
        </div>
      </div>
    </div>
  );

  // 共用的表單內容 JSX (僅包含欄位區塊，送出按鈕獨立)
  const formFieldsJSX = (
    <>
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 hover:shadow-md transition-shadow">
        <div className="mb-6">
          <label className="block font-bold text-slate-700 mb-2 cursor-pointer">
            姓名 / 暱稱
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="輸入名字..."
            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 transition-all text-slate-800 hover:border-emerald-300"
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
                className={`cursor-pointer whitespace-nowrap px-5 py-2.5 rounded-xl font-bold transition-all duration-300 border active:scale-90 ${
                  formData.positions.includes(pos)
                    ? "bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20 -translate-y-0.5"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                }`}
              >
                {pos}
              </button>
            ))}
          </div>
          {formData.positions.length === 0 && (
            <p className="text-red-500 text-sm font-medium mt-3 flex items-center gap-1 animate-fade-in">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full inline-block"></span>
              請至少選擇一個位置
            </p>
          )}
        </div>

        {/* 群組標籤管理與選擇 */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <div className="flex justify-between items-center mb-3">
            <label className="block font-bold text-slate-700">
              所屬群組標籤{" "}
              <span className="text-emerald-500 text-sm ml-1 font-medium">
                (最多 2 個)
              </span>
            </label>
            {groups.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setIsManagingGroups(!isManagingGroups);
                  if (isAddingGroup) setIsAddingGroup(false);
                }}
                className={`text-sm font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  isManagingGroups
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <Settings size={14} />{" "}
                {isManagingGroups ? "完成管理" : "管理標籤"}
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2.5">
            {groups.map((g) => {
              const isActive = formData.groupIds?.includes(g.id);
              const colors = GROUP_COLORS[g.color] || GROUP_COLORS.gray;
              return (
                <div key={g.id} className="relative group">
                  <button
                    type="button"
                    onClick={() => {
                      if (isManagingGroups) {
                        setEditingGroupId(g.id);
                        setNewGroupName(g.name);
                        setNewGroupColor(g.color);
                        setIsAddingGroup(true);
                      } else {
                        const currentIds = formData.groupIds || [];
                        if (
                          !currentIds.includes(g.id) &&
                          currentIds.length >= 2
                        ) {
                          showToast(
                            "每人最多只能加入 2 個群組標籤哦！",
                            "warning",
                          );
                          return;
                        }
                        togglePosition(g.id, currentIds, (newIds) =>
                          setFormData({ ...formData, groupIds: newIds }),
                        );
                      }
                    }}
                    className={`cursor-pointer whitespace-nowrap px-4 py-2 rounded-xl font-bold text-sm transition-all duration-300 border shadow-sm ${
                      isManagingGroups
                        ? `${colors.bg} ${colors.text} border-dashed border-${colors.border.split("-")[1] || "slate"}-400 hover:scale-105 pr-8`
                        : isActive
                          ? `${colors.bg} ${colors.text} ${colors.border} shadow-md -translate-y-0.5`
                          : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:border-slate-300 active:scale-90"
                    }`}
                  >
                    {g.name}
                  </button>
                  {isManagingGroups && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteGroup(g.id);
                      }}
                      className="cursor-pointer absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center bg-red-100 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-colors shadow-sm"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              );
            })}

            {!isAddingGroup && !isManagingGroups && (
              <button
                type="button"
                onClick={() => {
                  setEditingGroupId(null);
                  setNewGroupName("");
                  setNewGroupColor("emerald");
                  setIsAddingGroup(true);
                }}
                className="cursor-pointer px-4 py-2 rounded-xl font-bold text-sm text-emerald-600 bg-emerald-50 border border-emerald-200 border-dashed hover:bg-emerald-100 transition-all flex items-center gap-1 active:scale-95"
              >
                <Plus size={16} /> 新增標籤
              </button>
            )}
          </div>

          {isAddingGroup && (
            <div className="w-full bg-slate-50 p-5 rounded-2xl border border-slate-200 mt-4 animate-slide-up shadow-sm">
              <h4 className="font-bold text-slate-700 mb-3 text-sm flex items-center gap-1.5">
                {editingGroupId ? <Edit2 size={14} /> : <Plus size={14} />}
                {editingGroupId ? "編輯標籤" : "新增標籤"}
              </h4>
              <div className="flex flex-col gap-4">
                <input
                  type="text"
                  placeholder="輸入標籤名稱 (最多 6 字)"
                  maxLength={6}
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all"
                />
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">
                    標籤顏色
                  </label>
                  <div className="flex flex-wrap gap-2.5">
                    {Object.entries(GROUP_COLORS).map(([colorKey, colors]) => (
                      <button
                        key={colorKey}
                        type="button"
                        onClick={() => setNewGroupColor(colorKey)}
                        className={`cursor-pointer w-8 h-8 rounded-full ${colors.bg} border-2 ${colors.border} transition-all active:scale-90 flex items-center justify-center ${
                          newGroupColor === colorKey
                            ? "ring-4 ring-offset-1 ring-slate-200 scale-110 shadow-sm"
                            : "hover:scale-105"
                        }`}
                      >
                        {newGroupColor === colorKey && (
                          <CheckCircle2 size={14} className={colors.text} />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 justify-end mt-2 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingGroup(false);
                      setEditingGroupId(null);
                    }}
                    className="cursor-pointer px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      handleSaveGroup(e);
                      setIsAddingGroup(false);
                    }}
                    disabled={!newGroupName.trim()}
                    className="cursor-pointer px-6 py-2 text-sm font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-500 transition-all disabled:opacity-50 disabled:active:scale-100 active:scale-95 shadow-sm shadow-emerald-600/20"
                  >
                    儲存
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 hover:shadow-md transition-shadow">
        <h3 className="font-bold text-lg text-slate-800 mb-6 border-b border-slate-100 pb-3">
          進階資料
        </h3>
        {customFields.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            目前沒有自訂欄位，可至設定頁新增
          </p>
        ) : (
          <div className="space-y-6">
            {customFields.map((field, index) => {
              const isLast = index === customFields.length - 1;
              return (
                <div
                  key={field.id}
                  className={!isLast ? "border-b border-slate-100 pb-6" : ""}
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
                                  [field.id]:
                                    opt === formData.attributes[field.id]
                                      ? ""
                                      : opt,
                                },
                              })
                            }
                            className={`cursor-pointer whitespace-nowrap flex-1 py-3 rounded-xl font-bold text-sm transition-all border active:scale-95 ${
                              formData.attributes[field.id] === opt
                                ? "bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20 -translate-y-0.5"
                                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : field.type === "choice" ? (
                    <div>
                      <label className="font-bold text-slate-700 flex items-center gap-2 mb-3">
                        {field.name}{" "}
                        <span className="text-emerald-500 text-xs ml-1 font-medium">
                          {field.isMulti ? "(可複選)" : ""}
                        </span>
                      </label>
                      <div className="flex flex-wrap gap-2.5">
                        {(field.options || []).map((opt) => {
                          const currentVal = formData.attributes[field.id];
                          const isSelected = field.isMulti
                            ? Array.isArray(currentVal) &&
                              currentVal.includes(opt)
                            : currentVal === opt;
                          const handleClick = () => {
                            let newVal;
                            if (field.isMulti) {
                              const arr = Array.isArray(currentVal)
                                ? currentVal
                                : [];
                              newVal = arr.includes(opt)
                                ? arr.filter((x) => x !== opt)
                                : [...arr, opt];
                            } else {
                              newVal = currentVal === opt ? "" : opt;
                            }
                            setFormData({
                              ...formData,
                              attributes: {
                                ...formData.attributes,
                                [field.id]: newVal,
                              },
                            });
                          };
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={handleClick}
                              className={`cursor-pointer whitespace-nowrap px-4 py-2.5 rounded-xl font-bold text-sm transition-all border active:scale-95 ${
                                isSelected
                                  ? "bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20 -translate-y-0.5"
                                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                              }`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : field.type === "contact" ? (
                    <div>
                      <label className="font-bold text-slate-700 flex items-center gap-2 mb-3">
                        {field.name}
                      </label>
                      <div className="flex gap-2 h-[52px]">
                        <ContactSelect
                          value={
                            formData.attributes[field.id]?.platform || "ig"
                          }
                          onChange={(newPlatform) => {
                            const current = formData.attributes[field.id] || {
                              platform: "ig",
                              id: "",
                            };
                            setFormData({
                              ...formData,
                              attributes: {
                                ...formData.attributes,
                                [field.id]: {
                                  ...current,
                                  platform: newPlatform,
                                },
                              },
                            });
                          }}
                        />
                        <input
                          type="text"
                          value={formData.attributes[field.id]?.id || ""}
                          onChange={(e) => {
                            const current = formData.attributes[field.id] || {
                              platform: "ig",
                              id: "",
                            };
                            setFormData({
                              ...formData,
                              attributes: {
                                ...formData.attributes,
                                [field.id]: { ...current, id: e.target.value },
                              },
                            });
                          }}
                          placeholder={`輸入帳號或號碼...`}
                          className="flex-1 w-full min-w-0 px-4 sm:px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 transition-all text-slate-800 hover:border-emerald-300 shadow-sm"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="font-bold text-slate-700 flex items-center gap-2 mb-3">
                        {field.name}
                      </label>
                      <input
                        type={field.type === "number" ? "number" : "text"}
                        onWheel={(e) =>
                          field.type === "number" && e.target.blur()
                        }
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
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 transition-all text-slate-800 hover:border-emerald-300"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );

  // 共用的表單送出按鈕
  const FormSubmitButton = ({ isEditing }) => (
    <button
      type="submit"
      disabled={!formData.name.trim() || formData.positions.length === 0}
      className="cursor-pointer w-full bg-slate-800 text-white font-extrabold text-lg py-4 md:py-5 rounded-2xl shadow-[0_10px_25px_rgba(30,41,59,0.3)] hover:bg-slate-900 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none transition-all duration-300 transform active:scale-[0.98]"
    >
      {isEditing ? "儲存修改" : "新增至圖鑑"}
    </button>
  );

  // ====== 載入中畫面 ======
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw size={32} className="animate-spin text-emerald-500" />
          <p className="text-slate-500 font-medium">載入中...</p>
        </div>
      </div>
    );
  }

  // ====== 登入/註冊畫面 ======
  if (!user) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4 relative">
        <div
          className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.1)] font-bold text-sm flex items-center gap-2 transition-all duration-500 ${
            toast.show
              ? "translate-y-0 opacity-100"
              : "-translate-y-10 opacity-0 pointer-events-none"
          } ${
            toast.type === "success"
              ? "bg-emerald-600 text-white"
              : toast.type === "warning"
                ? "bg-amber-500 text-white"
                : "bg-red-500 text-white"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 size={18} />
          ) : (
            <AlertCircle size={18} />
          )}
          {toast.message}
        </div>

        <div className="text-center mb-8 animate-slide-up">
          <div className="bg-white p-4 rounded-full shadow-sm inline-block mb-4 border border-slate-100">
            <span className="text-5xl block transform hover:rotate-12 transition-transform duration-300">
              🏐
            </span>
          </div>
          <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-500">
            排球圖鑑 Volley Friends
          </h1>
          <p className="text-slate-500 font-medium mt-2">
            紀錄並管理你的排球好友圈
          </p>
        </div>

        <div
          className="bg-white w-full max-w-md p-8 rounded-3xl shadow-[0_15px_50px_rgba(0,0,0,0.05)] border border-slate-100 animate-slide-up"
          style={{ animationDelay: "0.1s" }}
        >
          <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center justify-center gap-2">
            {isLoginMode ? (
              <>
                <LogIn size={24} className="text-emerald-500" /> 登入帳號
              </>
            ) : (
              <>
                <UserPlus size={24} className="text-emerald-500" /> 註冊新帳號
              </>
            )}
          </h2>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {!isLoginMode && (
              <div>
                <label className="block font-bold text-slate-700 mb-1.5 text-sm">
                  暱稱
                </label>
                <div className="relative">
                  <User
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    required
                    value={authForm.nickname}
                    onChange={(e) =>
                      setAuthForm({ ...authForm, nickname: e.target.value })
                    }
                    placeholder="你想怎麼稱呼自己？"
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block font-bold text-slate-700 mb-1.5 text-sm">
                電子信箱
              </label>
              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="email"
                  required
                  value={authForm.email}
                  onChange={(e) =>
                    setAuthForm({ ...authForm, email: e.target.value })
                  }
                  placeholder="example@mail.com"
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5 text-sm">
                密碼
              </label>
              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="password"
                  required
                  value={authForm.password}
                  onChange={(e) =>
                    setAuthForm({ ...authForm, password: e.target.value })
                  }
                  placeholder="至少 6 個字元"
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all text-slate-800"
                />
              </div>
              {isLoginMode && (
                <div className="mt-2 text-right">
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    className="text-sm text-emerald-600 hover:text-emerald-500 font-medium transition-colors cursor-pointer"
                  >
                    忘記密碼？
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isAuthenticating}
              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-4 rounded-2xl transition-all shadow-[0_8px_20px_rgba(30,41,59,0.2)] active:scale-95 disabled:bg-slate-400 flex items-center justify-center gap-2 mt-6 cursor-pointer"
            >
              {isAuthenticating ? (
                <RefreshCw size={20} className="animate-spin" />
              ) : isLoginMode ? (
                "登入"
              ) : (
                "立即註冊"
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLoginMode(!isLoginMode);
              }}
              className="text-slate-500 hover:text-emerald-600 font-medium text-sm transition-colors cursor-pointer"
            >
              {isLoginMode ? "還沒有帳號？點此註冊" : "已有帳號？點此登入"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ====== 登入後的主畫面 ======
  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans selection:bg-emerald-100 text-slate-800 relative pb-32">
      {/* 全域 Toast 顯示 */}
      <div
        className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.1)] font-bold text-sm flex items-center gap-2 transition-all duration-500 ${
          toast.show
            ? "translate-y-0 opacity-100"
            : "-translate-y-10 opacity-0 pointer-events-none"
        } ${
          toast.type === "success"
            ? "bg-emerald-600 text-white"
            : toast.type === "warning"
              ? "bg-amber-500 text-white"
              : "bg-red-500 text-white"
        }`}
      >
        {toast.type === "success" ? (
          <CheckCircle2 size={18} />
        ) : (
          <AlertCircle size={18} />
        )}
        {toast.message}
      </div>

      {/* ====== 球員詳細資訊 Lightbox ====== */}
      {selectedFriend && !isEditModalOpen && (
        <div
          className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex justify-center items-center p-4 animate-fade-in"
          onClick={() => setSelectedFriend(null)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl animate-slide-up overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: 固定在頂部 */}
            <div className="shrink-0 bg-white/90 backdrop-blur-md px-6 py-5 border-b border-slate-100 flex justify-between items-start z-10">
              <div className="min-w-0 pr-4">
                <h2 className="text-2xl font-extrabold text-slate-800 break-words">
                  {selectedFriend.name}
                </h2>
                {/* Modal 內的標籤可自由折行 */}
                <div className="flex gap-1.5 flex-wrap items-center mt-2 w-full">
                  {selectedFriend.positions.map((p) => (
                    <span
                      key={p}
                      className="bg-emerald-500 text-white text-xs px-2.5 py-1 rounded-md font-bold shadow-sm"
                    >
                      {p}
                    </span>
                  ))}
                  {selectedFriend.groupIds?.map((gid) => {
                    const g = groups.find((x) => x.id === gid);
                    if (!g) return null;
                    const colors = GROUP_COLORS[g.color] || GROUP_COLORS.gray;
                    return (
                      <span
                        key={gid}
                        className={`text-xs px-2.5 py-1 rounded-md font-bold border shadow-sm ${colors.bg} ${colors.text} ${colors.border}`}
                      >
                        {g.name}
                      </span>
                    );
                  })}
                </div>
              </div>
              <button
                onClick={() => setSelectedFriend(null)}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-colors active:scale-95 cursor-pointer shrink-0 mt-1"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content: 滾動區域 */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1 bg-white">
              {customFields.map((field) => {
                const rawVal = selectedFriend.attributes[field.id];
                const isEmpty =
                  rawVal === undefined ||
                  rawVal === null ||
                  rawVal === "" ||
                  (Array.isArray(rawVal) && rawVal.length === 0);
                let displayVal = isEmpty ? "-" : rawVal;

                if (field.type === "choice" && Array.isArray(rawVal))
                  displayVal = rawVal.join(", ");
                else if (field.type === "contact") {
                  const contactFilled =
                    rawVal && rawVal.id && rawVal.id.trim() !== "";
                  return (
                    <div
                      key={field.id}
                      className={`bg-slate-50/80 p-3 rounded-2xl text-sm border border-slate-100 flex justify-between items-center transition-colors ${!contactFilled ? "opacity-60" : ""}`}
                    >
                      <span className="text-slate-500 font-medium flex items-center gap-1.5">
                        {field.name}
                      </span>
                      <span
                        className={`font-medium max-w-[160px] sm:max-w-[200px] ${!contactFilled ? "text-slate-400" : ""}`}
                      >
                        {!contactFilled ? (
                          "未填寫"
                        ) : (
                          <a
                            href={getContactWebLink(rawVal)}
                            onClick={(e) => handleContactClick(e, rawVal)}
                            target="_blank"
                            rel="noreferrer"
                            title={rawVal.id}
                            className="text-emerald-600 hover:text-emerald-500 flex items-center gap-2 bg-emerald-50 border border-emerald-100 shadow-sm px-3 py-2 rounded-xl transition-colors hover:shadow overflow-hidden"
                          >
                            <img
                              src={`src/assets/icons/${getIconPrefix(rawVal.platform)}-p.svg`}
                              alt={rawVal.platform}
                              className="w-5 h-5 shrink-0 object-contain"
                            />
                            <span className="font-bold truncate">
                              {rawVal.id}
                            </span>
                          </a>
                        )}
                      </span>
                    </div>
                  );
                }

                if (field.type === "rating") {
                  return (
                    <div
                      key={field.id}
                      className={`bg-slate-50/80 p-3 rounded-2xl flex justify-between items-center text-sm border border-slate-100 transition-colors ${isEmpty ? "opacity-60" : ""}`}
                    >
                      <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                        {field.name}
                      </span>
                      <span
                        className={`font-bold ${isEmpty ? "text-slate-400" : "text-slate-700"}`}
                      >
                        {isEmpty ? "未評分" : `Lv.${displayVal}`}
                      </span>
                    </div>
                  );
                }

                if (field.type === "yesno" || field.type === "choice") {
                  return (
                    <div
                      key={field.id}
                      className={`bg-slate-50/80 p-3 rounded-2xl text-sm border border-slate-100 flex justify-between items-center transition-colors ${isEmpty ? "opacity-60" : ""}`}
                    >
                      <span className="text-slate-500 font-medium flex items-center gap-1.5">
                        {field.name}
                      </span>
                      <span
                        className={`font-bold px-3 py-1 rounded-lg text-xs shadow-sm transition-colors ${isEmpty ? "bg-slate-200/50 text-slate-400" : "text-emerald-700 bg-emerald-100/60"}`}
                      >
                        {isEmpty ? "未填寫" : displayVal}
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={field.id}
                    className={`bg-slate-50/80 p-3 rounded-2xl text-sm border border-slate-100 transition-colors ${isEmpty ? "opacity-60" : ""}`}
                  >
                    <span className="text-slate-500 flex items-center gap-1.5 text-xs block mb-1 font-medium">
                      {field.name}
                    </span>
                    <span
                      className={`font-medium ${isEmpty ? "text-slate-300" : "text-slate-700"}`}
                    >
                      {isEmpty ? "未填寫" : displayVal}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Footer: 固定在底部 */}
            <div className="shrink-0 p-4 md:p-6 bg-slate-50 border-t border-slate-100 flex gap-3 mt-auto">
              <button
                onClick={() => openEditForm(selectedFriend)}
                className="flex-1 cursor-pointer bg-white border border-slate-200 text-slate-600 hover:text-emerald-600 hover:border-emerald-300 px-4 py-3 md:py-4 rounded-xl font-bold transition-all active:scale-95 flex justify-center items-center gap-2"
              >
                <Edit2 size={18} /> 編輯資料
              </button>
              <button
                onClick={() => handleDeleteFriend(selectedFriend.id)}
                className="cursor-pointer bg-white border border-slate-200 text-red-500 hover:bg-red-50 hover:border-red-200 px-4 py-3 md:py-4 rounded-xl font-bold transition-all active:scale-95 flex justify-center items-center"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== 編輯球員 Lightbox Modal ====== */}
      {isEditModalOpen && (
        <div
          className="fixed inset-0 z-[70] bg-slate-900/40 backdrop-blur-sm flex justify-center items-center p-4 animate-fade-in"
          onClick={() => setIsEditModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-slide-up overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: 固定在頂部 */}
            <div className="shrink-0 bg-white/90 backdrop-blur-md px-6 py-4 border-b border-slate-100 flex justify-between items-center z-10">
              <h2 className="text-xl font-extrabold text-slate-800">
                編輯球友資料
              </h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content & Footer: 包裝在 form 中確保滾動區域正確 */}
            <form
              onSubmit={(e) => handleSaveFriend(e, true)}
              className="flex flex-col flex-1 overflow-hidden min-h-0"
            >
              {/* Content: 滾動區域 */}
              <div className="p-6 space-y-6 overflow-y-auto flex-1 bg-slate-50/30">
                {formFieldsJSX}
              </div>
              {/* Footer: 固定在底部 */}
              <div className="shrink-0 p-4 md:p-6 bg-slate-50 border-t border-slate-100 mt-auto">
                <FormSubmitButton isEditing={true} />
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====== 篩選器 Lightbox Modal ====== */}
      {isFilterModalOpen && (
        <div
          className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex justify-center items-end md:items-center p-4 sm:p-0 animate-fade-in"
          onClick={() => setIsFilterModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl animate-slide-up overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: 固定在頂部 */}
            <div className="shrink-0 bg-white/90 backdrop-blur-md px-6 py-4 border-b border-slate-100 flex justify-between items-center z-10">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <Filter size={18} className="text-emerald-500" /> 進階篩選與排序
              </h3>
              <button
                onClick={() => setIsFilterModalOpen(false)}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-colors active:scale-95 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content: 滾動區域 */}
            <div className="p-6 overflow-y-auto flex-1 bg-white">
              <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 mb-5">
                <div className="flex items-center gap-3">
                  <label className="font-medium text-slate-500 text-sm flex items-center gap-1.5 whitespace-nowrap">
                    <ArrowUpDown size={14} /> 排序方式
                  </label>
                  <CustomSelect
                    value={sortBy}
                    onChange={(val) => setSortBy(val)}
                    options={[
                      { value: "", label: "預設 (建立順序)" },
                      ...customFields
                        .filter(
                          (f) => f.type === "rating" || f.type === "number",
                        )
                        .map((f) => ({
                          value: f.id,
                          label: `依 ${f.name} 高低`,
                        })),
                    ]}
                    className="flex-1"
                    innerClassName="bg-slate-50"
                  />
                </div>
              </div>

              {groups.length > 0 && (
                <div className="mb-6 border-b border-slate-100 pb-5">
                  <label className="block font-bold text-slate-700 mb-3 text-sm tracking-wide">
                    包含群組
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {groups.map((g) => {
                      const colors = GROUP_COLORS[g.color] || GROUP_COLORS.gray;
                      const isActive = filterGroups.includes(g.id);
                      return (
                        <button
                          key={g.id}
                          onClick={() =>
                            togglePosition(g.id, filterGroups, setFilterGroups)
                          }
                          className={`cursor-pointer px-3 py-1.5 rounded-xl font-medium text-xs transition-all duration-300 border shadow-sm active:scale-95 ${
                            isActive
                              ? `${colors.bg} ${colors.text} ${colors.border} shadow-md -translate-y-0.5`
                              : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          {g.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="mb-6">
                <label className="block font-bold text-slate-700 mb-3 text-sm tracking-wide">
                  包含位置
                </label>
                <div className="flex flex-wrap gap-2">
                  {POSITIONS.map((pos) => (
                    <button
                      key={pos}
                      onClick={() =>
                        togglePosition(pos, filterPositions, setFilterPositions)
                      }
                      className={`cursor-pointer px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-300 border active:scale-90 ${
                        filterPositions.includes(pos)
                          ? "bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20 -translate-y-0.5"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                      }`}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {customFields.map((field) => {
                  if (field.type === "rating") {
                    return (
                      <div
                        key={`filter-${field.id}`}
                        className="bg-slate-50 p-4 rounded-2xl border border-slate-100 transition-colors"
                      >
                        <label className="flex justify-between text-slate-600 mb-2 font-medium text-sm">
                          <span className="flex items-center gap-1.5">
                            <Star size={14} /> 最低 {field.name}
                          </span>
                          <span className="text-emerald-600 font-bold bg-emerald-100/50 px-2 rounded-md shadow-sm">
                            Lv. {filterValues[field.id] || 1}
                          </span>
                        </label>
                        <input
                          type="range"
                          min="1"
                          max="5"
                          value={filterValues[field.id] || 1}
                          onChange={(e) =>
                            setFilterValues({
                              ...filterValues,
                              [field.id]: Number(e.target.value),
                            })
                          }
                          className="w-full accent-emerald-500 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer hover:accent-emerald-400 transition-all"
                        />
                      </div>
                    );
                  }
                  if (field.type === "choice" || field.type === "yesno") {
                    const options =
                      field.type === "yesno"
                        ? ["是", "否", "不確定"]
                        : field.options || [];
                    const activeOptions = filterValues[field.id] || [];
                    return (
                      <div
                        key={`filter-${field.id}`}
                        className="bg-slate-50 p-4 rounded-2xl border border-slate-100 transition-colors"
                      >
                        <label className="flex items-center gap-1.5 text-slate-600 mb-3 font-medium text-sm">
                          {field.type === "choice" && field.isMulti ? (
                            <CheckSquare size={14} />
                          ) : (
                            <HelpCircle size={14} />
                          )}{" "}
                          {field.name} (可複選)
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {options.map((opt) => (
                            <button
                              key={opt}
                              onClick={() => {
                                const arr = [...activeOptions];
                                if (arr.includes(opt))
                                  setFilterValues({
                                    ...filterValues,
                                    [field.id]: arr.filter((x) => x !== opt),
                                  });
                                else
                                  setFilterValues({
                                    ...filterValues,
                                    [field.id]: [...arr, opt],
                                  });
                              }}
                              className={`cursor-pointer px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 border ${
                                activeOptions.includes(opt)
                                  ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                                  : "bg-white text-slate-500 border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  if (field.type === "number") {
                    const numFilter = filterValues[field.id] || {
                      op: ">=",
                      value: "",
                    };
                    return (
                      <div
                        key={`filter-${field.id}`}
                        className="bg-slate-50 p-4 rounded-2xl border border-slate-100 transition-colors"
                      >
                        <label className="flex items-center gap-1.5 text-slate-600 mb-2 font-medium text-sm">
                          <Hash size={14} /> {field.name}
                        </label>
                        <div className="flex gap-2">
                          <CustomSelect
                            value={numFilter.op}
                            onChange={(val) =>
                              setFilterValues({
                                ...filterValues,
                                [field.id]: { ...numFilter, op: val },
                              })
                            }
                            options={[
                              { value: ">=", label: "以上 (≥)" },
                              { value: "<=", label: "以下 (≤)" },
                            ]}
                            className="w-[110px] shrink-0"
                          />
                          <input
                            type="number"
                            onWheel={(e) => e.target.blur()}
                            placeholder="輸入數值"
                            value={numFilter.value}
                            onChange={(e) =>
                              setFilterValues({
                                ...filterValues,
                                [field.id]: {
                                  ...numFilter,
                                  value: e.target.value,
                                },
                              })
                            }
                            className="flex-1 w-full bg-white border border-slate-200 rounded-2xl px-4 py-3.5 text-sm text-slate-700 outline-none focus:border-emerald-400 shadow-sm transition-all"
                          />
                        </div>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>

            {/* Footer: 固定在底部 */}
            <div className="shrink-0 p-4 md:p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center mt-auto">
              <button
                onClick={() => {
                  setFilterPositions([]);
                  setFilterGroups([]);
                  setFilterValues({});
                  setSortBy("skill");
                }}
                className="cursor-pointer whitespace-nowrap text-sm font-semibold text-slate-500 hover:text-red-500 transition-colors px-4 py-2 rounded-xl hover:bg-white border border-transparent hover:border-red-100 active:scale-95"
              >
                清除條件
              </button>
              <button
                onClick={() => setIsFilterModalOpen(false)}
                className="cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-xl font-bold transition-all active:scale-95 shadow-sm shadow-emerald-500/20"
              >
                套用並查看
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 pt-safe transition-all">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1
            className="text-2xl font-extrabold flex items-center gap-2 bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-500 hover:scale-[1.02] transition-transform cursor-pointer"
            onClick={() => {
              setActiveTab("list");
              window.scrollTo(0, 0);
            }}
          >
            <span className="text-emerald-500 transform hover:rotate-12 transition-transform duration-300">
              🏐
            </span>{" "}
            排球圖鑑
          </h1>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 shadow-sm cursor-default">
              {isSyncing ? (
                <RefreshCw
                  size={14}
                  className="animate-spin text-emerald-500"
                />
              ) : (
                <Cloud size={14} className="text-emerald-500" />
              )}
              雲端同步中
            </div>
            <button
              onClick={() => setActiveTab("profile")}
              className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 px-4 py-1.5 rounded-full shadow-sm active:scale-95 transition-all cursor-pointer"
              title="前往會員中心"
            >
              <User size={16} className="text-emerald-600" />
              <span className="text-sm font-bold text-emerald-800">
                Hi, {profile?.nickname || "球友"}
              </span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-6 pt-6 pb-6">
        {/* 利用 key 強制觸發淡入轉場動畫 */}
        <div key={activeTab} className="animate-fade-in">
          {/* ==================== 列表頁面 ==================== */}
          {activeTab === "list" && (
            <div>
              <div className="flex flex-col sm:flex-row gap-3 mb-8">
                <div className="relative flex-1 group cursor-text">
                  <Search
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors"
                    size={20}
                  />
                  <input
                    type="text"
                    placeholder="搜尋姓名..."
                    value={filterName}
                    onChange={(e) => setFilterName(e.target.value)}
                    className="w-full pl-12 pr-10 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 transition-all text-slate-700 shadow-sm hover:border-emerald-300"
                  />
                  {filterName && (
                    <button
                      onClick={() => setFilterName("")}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors cursor-pointer"
                    >
                      <XCircle size={18} />
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsFilterModalOpen(true)}
                    className={`cursor-pointer whitespace-nowrap px-5 py-3.5 sm:py-0 rounded-2xl flex-1 sm:flex-none flex items-center justify-center gap-2 transition-all duration-300 shadow-sm border active:scale-95 font-bold text-sm ${
                      activeFiltersCount > 0
                        ? "bg-emerald-500 border-emerald-500 text-white shadow-emerald-500/20"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                    }`}
                  >
                    <Filter
                      size={18}
                      className={
                        activeFiltersCount > 0
                          ? "fill-emerald-400 text-emerald-100"
                          : "text-slate-400"
                      }
                    />
                    篩選與排序{" "}
                    {activeFiltersCount > 0 && (
                      <span className="bg-white text-emerald-600 px-1.5 py-0.5 rounded-md text-[10px] ml-1">
                        {activeFiltersCount}
                      </span>
                    )}
                  </button>

                  {/* 外部清除篩選按鈕 (若有套用篩選條件) */}
                  {activeFiltersCount > 0 && (
                    <button
                      onClick={() => {
                        setFilterPositions([]);
                        setFilterGroups([]);
                        setFilterValues({});
                        setSortBy("skill");
                      }}
                      className="cursor-pointer whitespace-nowrap px-4 bg-red-50 text-red-500 border border-red-100 hover:bg-red-100 rounded-2xl flex items-center justify-center transition-all active:scale-95 font-bold text-sm"
                      title="清除篩選條件"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-12">
                {isSyncing ? (
                  // 當正在取得雲端資料時，顯示光澤骨架屏排版
                  POSITIONS.slice(0, 2).map((pos) => (
                    <div key={`skeleton-section-${pos}`}>
                      <div className="flex items-center justify-between mb-5 px-1">
                        <h3 className="flex items-center gap-3">
                          <span className="w-1.5 h-7 bg-emerald-100/50 rounded-full inline-block"></span>
                          <div className="h-8 w-24 rounded-lg shimmer-bg"></div>
                        </h3>
                        <div className="h-6 w-16 rounded-full shimmer-bg"></div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
                        <SkeletonCard />
                        <SkeletonCard />
                        <SkeletonCard />
                      </div>
                    </div>
                  ))
                ) : filteredFriends.length === 0 ? (
                  <div className="text-center py-20 text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200 shadow-sm">
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
                      <div key={`section-${pos}`}>
                        <div className="flex items-center justify-between mb-5 px-1">
                          <h3 className="font-extrabold text-2xl text-slate-800 flex items-center gap-3 hover:translate-x-1 transition-transform cursor-default">
                            <span className="w-1.5 h-7 bg-emerald-500 rounded-full inline-block shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                            {pos}
                          </h3>
                          <span className="bg-emerald-50 text-emerald-700 text-sm px-3 py-1 rounded-full font-bold border border-emerald-100 shadow-sm">
                            {playersInPos.length} 人
                          </span>
                        </div>
                        {playersInPos.length === 0 ? (
                          <div className="text-slate-400 text-sm py-6 bg-white/50 rounded-3xl border border-dashed border-slate-200 text-center font-medium transition-all hover:bg-slate-50">
                            目前無 {pos} 球友
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
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

          {/* ==================== 新增頁面 ==================== */}
          {activeTab === "form" && (
            <div className="max-w-2xl mx-auto pb-10">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-extrabold text-slate-800">
                  新增球友
                </h2>
              </div>
              <form
                onSubmit={(e) => handleSaveFriend(e, false)}
                className="space-y-6"
              >
                {formFieldsJSX}
                <FormSubmitButton isEditing={false} />
              </form>
            </div>
          )}

          {/* ==================== 欄位與群組設定頁面 ==================== */}
          {activeTab === "fields" && (
            <div className="max-w-2xl mx-auto">
              <h2 className="text-3xl font-extrabold text-slate-800 mb-3">
                設定與資料管理
              </h2>
              <p className="text-slate-500 mb-8 font-medium">
                管理你的圖鑑自訂欄位，群組標籤可直接於新增/編輯球友時管理。
              </p>

              <div className="h-px bg-slate-200 w-full mb-10"></div>

              {/* ------ 自訂欄位管理 ------ */}
              <div>
                <h3 className="font-bold text-xl text-slate-800 mb-6 flex items-center gap-2">
                  <List size={22} className="text-emerald-500" />{" "}
                  自訂評分與欄位管理
                </h3>

                {/* 新增/編輯 項目欄位表單 */}
                <form
                  onSubmit={handleSaveField}
                  className={`p-6 md:p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border mb-10 transition-all ${
                    editingFieldId
                      ? "bg-emerald-50/50 border-emerald-300 ring-4 ring-emerald-50"
                      : "bg-white border-slate-100 hover:shadow-md"
                  }`}
                >
                  <div className="flex justify-between items-center mb-5">
                    <h3 className="font-bold text-emerald-600 flex items-center gap-2 text-lg">
                      <div className="p-1.5 bg-emerald-100 rounded-lg shadow-sm">
                        {editingFieldId ? (
                          <Edit2 size={18} />
                        ) : (
                          <Plus size={18} />
                        )}
                      </div>{" "}
                      {editingFieldId ? "編輯項目欄位" : "新增項目欄位"}
                    </h3>
                    {editingFieldId && (
                      <button
                        type="button"
                        onClick={cancelEditField}
                        className="text-sm font-bold text-slate-400 hover:text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm active:scale-95 cursor-pointer transition-transform"
                      >
                        取消編輯
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col gap-4">
                    <input
                      type="text"
                      required
                      placeholder="輸入欄位名稱 (例如：身高、發球)"
                      value={newFieldName}
                      onChange={(e) => setNewFieldName(e.target.value)}
                      className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 text-slate-800 transition-all hover:border-emerald-300 shadow-sm"
                    />
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                      {[
                        { id: "rating", icon: Star, label: "評分" },
                        { id: "text", icon: AlignLeft, label: "文字" },
                        { id: "number", icon: Hash, label: "數字" },
                        { id: "yesno", icon: HelpCircle, label: "是非" },
                        { id: "choice", icon: List, label: "選擇" },
                        { id: "contact", icon: Phone, label: "聯絡" },
                      ].map((type) => (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => setNewFieldType(type.id)}
                          className={`cursor-pointer whitespace-nowrap py-3 rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition-all border active:scale-95 ${
                            newFieldType === type.id
                              ? "bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20 -translate-y-0.5"
                              : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                          }`}
                        >
                          <type.icon
                            size={18}
                            className={
                              newFieldType === type.id ? "text-emerald-100" : ""
                            }
                          />
                          {type.label}
                        </button>
                      ))}
                    </div>

                    {newFieldType === "choice" && (
                      <div className="space-y-4 animate-slide-up">
                        <input
                          type="text"
                          required
                          placeholder="輸入選項，請用逗號分隔 (例: 男網,女網,混合網)"
                          value={newFieldOptions}
                          onChange={(e) => setNewFieldOptions(e.target.value)}
                          className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 text-slate-800 transition-all hover:border-emerald-300 shadow-sm"
                        />
                        <label className="flex items-center gap-3 cursor-pointer bg-white border border-slate-200 p-4 rounded-2xl hover:bg-slate-50 transition-colors">
                          <div className="relative">
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={isMultiChoice}
                              onChange={(e) =>
                                setIsMultiChoice(e.target.checked)
                              }
                            />
                            <div
                              className={`w-11 h-6 rounded-full transition-colors ${isMultiChoice ? "bg-emerald-500" : "bg-slate-200"}`}
                            ></div>
                            <div
                              className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform shadow-sm ${isMultiChoice ? "translate-x-5" : "translate-x-0"}`}
                            ></div>
                          </div>
                          <div className="font-bold text-slate-700">
                            允許多選
                            <div className="text-xs text-slate-400 font-normal mt-0.5">
                              開啟後，填寫資料時可同時勾選多個選項
                            </div>
                          </div>
                        </label>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="cursor-pointer w-full mt-2 bg-slate-800 hover:bg-slate-900 text-white py-4 rounded-xl font-bold shadow-[0_4px_15px_rgba(30,41,59,0.3)] transition-all active:scale-[0.98]"
                    >
                      {editingFieldId ? "儲存欄位變更" : "加入新欄位"}
                    </button>
                  </div>
                </form>

                <div>
                  <h4 className="font-bold text-slate-800 mb-4 text-md">
                    目前的欄位順序
                  </h4>
                  <div className="space-y-4">
                    {editableFields.map((field, index) => (
                      <div
                        key={field.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragEnter={(e) => handleDragEnter(e, index)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, index)}
                        onDragEnd={handleDragEnd}
                        className={`flex justify-between items-center bg-white p-4 rounded-2xl border shadow-sm transition-all duration-300 hover:shadow-md ${
                          draggedIdx === index
                            ? "opacity-40 border-emerald-500 scale-[0.98]"
                            : dragOverIdx === index
                              ? "border-emerald-500 border-dashed bg-emerald-50 scale-[1.02]"
                              : "border-slate-200 hover:border-emerald-300"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-emerald-500 py-2 transition-colors">
                            <GripVertical size={20} />
                          </div>
                          <div
                            className={`p-3 rounded-xl shadow-sm ${
                              field.type === "rating"
                                ? "bg-amber-100 text-amber-600"
                                : field.type === "text"
                                  ? "bg-blue-100 text-blue-600"
                                  : field.type === "yesno"
                                    ? "bg-emerald-100 text-emerald-600"
                                    : field.type === "number"
                                      ? "bg-rose-100 text-rose-600"
                                      : field.type === "contact"
                                        ? "bg-indigo-100 text-indigo-600"
                                        : "bg-purple-100 text-purple-600"
                            }`}
                          >
                            {field.type === "rating" ? (
                              <Star size={20} />
                            ) : field.type === "text" ? (
                              <AlignLeft size={20} />
                            ) : field.type === "yesno" ? (
                              <HelpCircle size={20} />
                            ) : field.type === "number" ? (
                              <Hash size={20} />
                            ) : field.type === "contact" ? (
                              <Phone size={20} />
                            ) : field.isMulti ? (
                              <CheckSquare size={20} />
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
                                  ? "自由文字"
                                  : field.type === "number"
                                    ? "數字輸入"
                                    : field.type === "contact"
                                      ? "聯絡方式"
                                      : field.type === "yesno"
                                        ? "是非題"
                                        : `選擇題 (${field.options?.join(", ")}) ${field.isMulti ? "[可複選]" : ""}`}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="hidden md:flex flex-col gap-1 mr-2">
                            <button
                              type="button"
                              onClick={() => moveField(index, "up")}
                              disabled={index === 0}
                              className="cursor-pointer p-1 text-slate-400 hover:text-emerald-600 disabled:opacity-20 transition-colors active:scale-90"
                            >
                              <ArrowUp size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveField(index, "down")}
                              disabled={index === editableFields.length - 1}
                              className="cursor-pointer p-1 text-slate-400 hover:text-emerald-600 disabled:opacity-20 transition-colors active:scale-90"
                            >
                              <ArrowDown size={16} />
                            </button>
                          </div>
                          <div className="h-8 w-px bg-slate-100 mx-1 hidden md:block"></div>
                          <button
                            onClick={() => handleEditField(field)}
                            className="cursor-pointer p-2.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all active:scale-90"
                          >
                            <Edit2 size={20} />
                          </button>
                          <button
                            onClick={() => handleDeleteField(field.id)}
                            className="cursor-pointer p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-90"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </div>
                    ))}

                    {noteField && (
                      <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-200 opacity-80 cursor-not-allowed">
                        <div className="flex items-center gap-4">
                          <div className="w-6 mx-2"></div>
                          <div className="p-3 rounded-xl shadow-sm bg-slate-200 text-slate-500">
                            <AlignLeft size={20} />
                          </div>
                          <div>
                            <div className="font-bold text-slate-600 text-lg flex items-center gap-2">
                              {noteField.name}{" "}
                              <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded-full">
                                已鎖定
                              </span>
                            </div>
                            <div className="text-xs font-medium text-slate-400 mt-0.5">
                              系統預設固定於最下方
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== 資料分享與備份頁面 ==================== */}
          {activeTab === "share" && (
            <div className="max-w-2xl mx-auto">
              <h2 className="text-3xl font-extrabold text-slate-800 mb-3">
                資料分享與備份
              </h2>
              <p className="text-slate-500 mb-8 font-medium">
                匯出/匯入你的排球圖鑑，或與朋友直接雲端共享。
              </p>

              {/* 雲端代碼分享區塊 */}
              <div className="bg-gradient-to-br from-indigo-800 to-slate-900 p-6 md:p-8 rounded-3xl shadow-[0_12px_40px_rgb(0,0,0,0.15)] border border-indigo-700 text-white mb-8 hover:shadow-[0_15px_50px_rgb(0,0,0,0.2)] transition-shadow">
                <h3 className="font-bold text-xl mb-6 flex items-center gap-2">
                  <Cloud size={24} className="text-indigo-400 animate-pulse" />{" "}
                  雲端代碼分享
                </h3>

                <div className="bg-white/10 backdrop-blur-sm p-5 rounded-2xl border border-white/10 mb-6">
                  <h4 className="font-medium text-indigo-300 mb-3 text-sm">
                    你的專屬分享代碼
                  </h4>
                  <div className="flex items-center justify-between bg-black/30 p-4 rounded-xl border border-white/10 hover:border-indigo-500/50 transition-colors">
                    <span className="text-3xl font-mono font-bold tracking-[0.2em] text-white pl-2 select-all">
                      {profile?.shareCode || "讀取中"}
                    </span>
                    <button
                      onClick={handleCopyCode}
                      disabled={!profile?.shareCode}
                      className="cursor-pointer whitespace-nowrap px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-1 active:scale-90 bg-indigo-600 hover:bg-indigo-500 text-white"
                    >
                      <Copy size={16} /> 複製
                    </button>
                  </div>
                  <p className="text-xs text-indigo-200/70 mt-3 font-medium leading-relaxed">
                    將代碼分享給好友，他們就能直接匯入你建立的圖鑑資料！
                  </p>
                </div>

                <div className="bg-white/10 backdrop-blur-sm p-5 rounded-2xl border border-white/10">
                  <h4 className="font-medium text-indigo-300 mb-3 text-sm flex items-center gap-2">
                    <DownloadCloud size={16} /> 匯入他人代碼
                  </h4>
                  <div className="flex flex-col md:flex-row gap-3">
                    <input
                      type="text"
                      value={importCode}
                      onChange={(e) => {
                        setImportCode(e.target.value.toUpperCase());
                        setImportConfirm(false);
                      }}
                      placeholder="輸入 6 碼代碼..."
                      className="flex-1 min-w-0 bg-black/30 border border-white/10 rounded-xl px-5 py-4 text-white outline-none focus:border-indigo-400 font-mono text-lg uppercase tracking-widest transition-colors disabled:opacity-50"
                      maxLength={6}
                      disabled={importConfirm || isImporting}
                    />
                    {!importConfirm ? (
                      <button
                        onClick={() => setImportConfirm(true)}
                        disabled={importCode.length !== 6 || isImporting}
                        className="shrink-0 w-full md:w-auto cursor-pointer whitespace-nowrap bg-indigo-500 hover:bg-indigo-400 disabled:bg-slate-700 disabled:text-slate-500 text-white px-6 py-4 rounded-xl font-bold transition-all active:scale-95 disabled:active:scale-100 flex items-center justify-center gap-2"
                      >
                        準備匯入
                      </button>
                    ) : (
                      <div className="shrink-0 w-full md:w-auto flex flex-col md:flex-row gap-2 animate-fade-in">
                        <button
                          onClick={handleImportByCode}
                          disabled={isImporting}
                          className="w-full md:w-auto cursor-pointer whitespace-nowrap bg-red-500 hover:bg-red-600 disabled:bg-red-800 text-white px-5 py-4 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-red-500/20 text-sm flex items-center justify-center gap-1"
                        >
                          {isImporting ? (
                            <RefreshCw size={16} className="animate-spin" />
                          ) : (
                            <AlertCircle size={16} />
                          )}
                          {isImporting ? "匯入中..." : "確認覆蓋"}
                        </button>
                        <button
                          onClick={() => setImportConfirm(false)}
                          disabled={isImporting}
                          className="w-full md:w-auto cursor-pointer whitespace-nowrap bg-slate-700 hover:bg-slate-600 text-white px-5 py-4 rounded-xl font-bold transition-all active:scale-95 text-sm flex items-center justify-center"
                        >
                          取消
                        </button>
                      </div>
                    )}
                  </div>
                  {importConfirm && (
                    <p className="text-red-300 text-xs mt-3 font-bold flex items-center gap-1 animate-slide-up">
                      ⚠️ 警告：這將會清除並覆蓋你目前帳號的所有圖鑑資料！
                    </p>
                  )}
                </div>
              </div>

              {/* 本地檔案備份 (JSON) 區塊 */}
              <div className="bg-white p-6 md:p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
                <h3 className="font-bold text-xl text-slate-800 mb-6 flex items-center gap-2">
                  <FileJson size={24} className="text-emerald-500" />{" "}
                  本地檔案備份 (JSON)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                        <DownloadCloud size={16} /> 匯出 JSON 備份
                      </h4>
                      <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                        將你目前的球友名單與自訂欄位，完整打包下載到裝置中備份。
                      </p>
                    </div>
                    <button
                      onClick={handleExportJson}
                      className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-xl transition-all active:scale-95 shadow-sm cursor-pointer flex items-center justify-center gap-2 text-sm"
                    >
                      <DownloadCloud size={16} /> 下載備份檔
                    </button>
                  </div>

                  <div
                    className={`border-2 border-dashed rounded-2xl p-5 flex flex-col items-center justify-center text-center transition-all relative ${
                      isDraggingFile
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-emerald-300"
                    }`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingFile(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setIsDraggingFile(false);
                    }}
                    onDrop={handleDropFile}
                  >
                    <input
                      type="file"
                      accept=".json"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      ref={fileInputRef}
                      onChange={(e) => {
                        if (e.target.files[0])
                          processFileImport(e.target.files[0]);
                        e.target.value = ""; // Reset
                      }}
                    />
                    <UploadCloud
                      size={28}
                      className={
                        isDraggingFile
                          ? "text-emerald-500 mb-2"
                          : "text-slate-400 mb-2"
                      }
                    />
                    <h4 className="font-bold text-slate-700 mb-1 text-sm">
                      匯入 JSON 檔案
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      拖曳檔案至此或點擊選擇
                      <br />
                      (AI 生成的 JSON 也適用！)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== 會員中心頁面 ==================== */}
          {activeTab === "profile" && (
            <div className="max-w-2xl mx-auto">
              <h2 className="text-3xl font-extrabold text-slate-800 mb-8">
                會員中心
              </h2>
              <div className="bg-white p-6 md:p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 mb-8">
                <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-100">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-200">
                    <User size={32} />
                  </div>
                  <div>
                    <h3 className="font-bold text-xl text-slate-800">
                      {profile?.nickname || "使用者"}
                    </h3>
                    <p className="text-slate-500 text-sm">{user?.email}</p>
                  </div>
                </div>

                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  <div>
                    <label className="block font-bold text-slate-700 mb-2">
                      修改暱稱
                    </label>
                    <div className="relative">
                      <User
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <input
                        type="text"
                        value={profileForm.nickname}
                        onChange={(e) =>
                          setProfileForm({
                            ...profileForm,
                            nickname: e.target.value,
                          })
                        }
                        className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 transition-all text-slate-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-2">
                      修改密碼{" "}
                      <span className="text-xs text-slate-400 font-normal ml-2">
                        (若不修改請留空)
                      </span>
                    </label>
                    <div className="relative">
                      <Lock
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <input
                        type="password"
                        value={profileForm.newPassword}
                        onChange={(e) =>
                          setProfileForm({
                            ...profileForm,
                            newPassword: e.target.value,
                          })
                        }
                        placeholder="輸入新密碼 (至少 6 個字元)"
                        className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 transition-all text-slate-800"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isUpdatingProfile}
                    className="cursor-pointer w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-[0_4px_15px_rgba(16,185,129,0.3)] transition-all active:scale-[0.98] disabled:bg-slate-300 disabled:shadow-none flex items-center justify-center gap-2"
                  >
                    {isUpdatingProfile ? (
                      <RefreshCw size={20} className="animate-spin" />
                    ) : (
                      "儲存修改"
                    )}
                  </button>
                </form>
              </div>

              <button
                onClick={handleLogout}
                className="cursor-pointer w-full flex items-center justify-center gap-2 bg-white text-red-500 font-bold py-4 rounded-3xl shadow-sm border border-red-100 hover:bg-red-50 transition-all active:scale-[0.98]"
              >
                <LogOut size={20} /> 登出帳號
              </button>
            </div>
          )}
        </div>
      </main>

      {/* 底部浮動導覽列 */}
      <nav
        className={`fixed z-50 flex overflow-hidden transition-all duration-500 ease-out select-none bottom-0 left-0 w-full bg-white/90 backdrop-blur-xl border-t border-slate-200 pb-safe md:bottom-10 md:right-10 md:left-auto md:w-auto md:border md:rounded-3xl md:shadow-[0_15px_50px_rgba(0,0,0,0.15)] md:pb-0 hover:shadow-[0_20px_60px_rgba(0,0,0,0.2)]`}
        style={
          window.innerWidth >= 768 && (navPos.x !== 0 || navPos.y !== 0)
            ? { transform: `translate(${navPos.x}px, ${navPos.y}px)` }
            : {}
        }
      >
        <div
          className="hidden md:flex items-center justify-center px-4 cursor-grab active:cursor-grabbing hover:bg-slate-50 text-slate-400 hover:text-emerald-500 border-r border-slate-100 transition-colors"
          onMouseDown={handleNavMouseDown}
        >
          <GripVertical size={24} />
        </div>
        <div className="flex flex-1 md:flex-none">
          {[
            { id: "list", icon: Users, label: "球友" },
            {
              id: "form",
              icon: formData.id && activeTab === "form" ? Edit2 : UserPlus,
              label: formData.id && activeTab === "form" ? "編輯" : "新增",
            },
            { id: "fields", icon: Settings, label: "設定" },
            { id: "share", icon: Share2, label: "分享" },
            { id: "profile", icon: User, label: "會員" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id === "form" && activeTab !== "form") openAddForm();
                else setActiveTab(tab.id);
              }}
              className={`cursor-pointer whitespace-nowrap flex-1 md:flex-none md:w-[72px] py-3.5 md:py-4 flex flex-col items-center gap-1.5 transition-all duration-300 relative group ${
                activeTab === tab.id
                  ? "text-emerald-600 bg-emerald-50/30"
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
              }`}
            >
              <div
                className={`transition-all duration-300 transform group-hover:scale-110 group-active:scale-95 ${
                  activeTab === tab.id
                    ? "scale-110 -translate-y-0.5"
                    : "scale-100"
                }`}
              >
                <tab.icon
                  size={22}
                  strokeWidth={activeTab === tab.id ? 2.5 : 2}
                />
              </div>
              <span className="text-[10px] font-bold tracking-wide transition-colors">
                {tab.label}
              </span>
              <div
                className={`absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1 bg-emerald-500 rounded-b-full shadow-[0_0_10px_rgba(16,185,129,0.6)] transition-all duration-300 ${
                  activeTab === tab.id
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 -translate-y-2"
                }`}
              ></div>
            </button>
          ))}
        </div>
      </nav>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        /* 隱藏數字輸入框的上下箭頭 */
        input[type=number]::-webkit-inner-spin-button, 
        input[type=number]::-webkit-outer-spin-button { 
          -webkit-appearance: none; 
          margin: 0; 
        }
        input[type=number] {
          -moz-appearance: textfield;
        }

        /* 漸層遮罩 (讓過長的標籤優雅淡出) */
        .mask-fade-right {
          -webkit-mask-image: linear-gradient(to right, black 85%, transparent 100%);
          mask-image: linear-gradient(to right, black 85%, transparent 100%);
        }
        
        /* 隱藏水平卷軸但保持滑動 */
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        /* 現代化骨架屏光澤動畫 (Shimmer Effect) */
        .shimmer-bg {
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite linear;
        }
        @keyframes shimmer {
          from { background-position: -200% 0; }
          to { background-position: 200% 0; }
        }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
        .animate-slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        
        /* 彩虹漸層邊框動畫 */
        .rainbow-border-animate {
          background: linear-gradient(124deg, #ff2400, #e81d1d, #e8b71d, #1de840, #1ddde8, #2b1de8, #dd00f3, #ff2400);
          background-size: 400% 400%;
          animation: rainbow-bg 5s ease infinite;
        }
        @keyframes rainbow-bg {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .pb-safe { padding-bottom: env(safe-area-inset-bottom, 0px); }
        .pt-safe { padding-top: env(safe-area-inset-top, 0px); }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `,
        }}
      />
    </div>
  );
}
