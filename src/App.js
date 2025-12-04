import React, { useState, useEffect } from 'react';
import { Plus, Minus, Trash2, User, DollarSign, ShoppingBag, Receipt, Users, Check, Camera, Loader, Edit2, Lock, LogIn, Share2, AlertCircle, AlertTriangle, LogOut, Download, RefreshCw, Divide, Calculator, Percent, Hash } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, onSnapshot, updateDoc, arrayUnion } from 'firebase/firestore';

// --- FIREBASE CONFIGURATION ---
// TODO: Paste your actual keys from the Firebase Console here!
const firebaseConfig = {
  apiKey: "AIzaSyAR1__kkZROCwVt3JgKsvpmooKhdbz67_M",
  authDomain: "snapsplit-18a5e.firebaseapp.com",
  projectId: "snapsplit-18a5e",
  storageBucket: "snapsplit-18a5e.firebasestorage.app",
  messagingSenderId: "691065062228",
  appId: "1:691065062228:web:ca1e44e5584330980f7ec1",
  measurementId: "G-BRKZJG39XP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'snapsplit-web-prod'; 

const SnapSplit = () => {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('lobby');
  const [roomId, setRoomId] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);

  const [items, setItems] = useState([]);
  const [people, setPeople] = useState([]);
  const [tax, setTax] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [taxStrategy, setTaxStrategy] = useState('smart'); // 'smart' | 'proportional' | 'item_count'

  const [activeTab, setActiveTab] = useState('split');
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);
  const [userName, setUserName] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [editingItem, setEditingItem] = useState(null);

  // --- 1. INITIALIZATION ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error("Auth Error:", err);
      }
    };
    initAuth();

    const savedRoomId = localStorage.getItem('snapsplit_room_id');
    if (savedRoomId) {
        setRoomId(savedRoomId);
    }

    const handleInstall = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstall);
    };
  }, []);

  useEffect(() => {
     return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (!u && firebaseConfig.apiKey.includes("YOUR_FIREBASE")) {
          setError("Setup incomplete: Fill in Firebase keys in src/App.js");
      }
    });
  }, []);

  // --- 2. REAL-TIME SYNC ---
  useEffect(() => {
    if (!user || !roomId) return;

    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'bills', roomId);
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setItems(data.items || []);
        setPeople(data.people || []);
        setTax(data.tax || 0);
        setDiscount(data.discount || 0);
        setTaxStrategy(data.taxStrategy || 'smart');
        setIsOwner(data.ownerId === user.uid);
        setView('app');
        localStorage.setItem('snapsplit_room_id', roomId);
      } else {
        if (view === 'app') {
            setError("Room closed or not found.");
            setView('lobby');
            localStorage.removeItem('snapsplit_room_id');
            setRoomId('');
        }
      }
    }, (err) => {
      if (err.code === 'permission-denied') setError("Permission Denied. Check Firestore Rules.");
      else setError("Connection lost. Reconnecting...");
    });
    return () => unsubscribe();
  }, [user, roomId, view]);

  // --- ACTIONS ---
  const handleInstallClick = () => {
    if (installPrompt) {
      installPrompt.prompt();
      setInstallPrompt(null);
    }
  };

  const leaveRoom = () => {
      localStorage.removeItem('snapsplit_room_id');
      setRoomId('');
      setView('lobby');
      setItems([]);
      setPeople([]);
  };

  const clearItems = async () => {
    if (!isOwner) return;
    if (!window.confirm("Clear all items? This cannot be undone.")) return;
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'bills', roomId), {
        items: [],
        tax: 0,
        discount: 0
    });
  };

  const createRoom = async () => {
    if (!userName.trim()) { setError("Please enter your name"); return; }
    if (!user) { setError("Not authenticated. Please wait."); return; }
    setIsCreating(true); setError('');
    try {
      const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'bills', newRoomId), {
        ownerId: user.uid,
        createdAt: new Date().toISOString(),
        people: [{ id: user.uid, name: userName }],
        items: [], tax: 0, discount: 0, taxStrategy: 'smart'
      });
      setRoomId(newRoomId);
    } catch (err) {
      setIsCreating(false);
      setError(err.code === 'permission-denied' ? "Permission Denied! Check Firestore Rules." : "Failed to create room.");
    }
  };

  const joinRoom = async () => {
    if (!userName.trim() || !joinCode.trim()) { setError("Enter Name and Code"); return; }
    if (!user) { setError("Not authenticated. Please wait."); return; }
    setIsCreating(true); setError('');
    try {
      const code = joinCode.toUpperCase();
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'bills', code);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        if (!snap.data().people.some(p => p.id === user.uid)) {
          await updateDoc(docRef, { people: arrayUnion({ id: user.uid, name: userName }) });
        }
        setRoomId(code);
      } else {
        setError("Room not found.");
        setIsCreating(false);
      }
    } catch (err) {
      setIsCreating(false);
      setError(err.code === 'permission-denied' ? "Permission Denied! Check Firestore Rules." : "Failed to join.");
    }
  };

  const addItem = async () => {
    if (!isOwner || !newItemName || !newItemPrice) return;
    
    const newItem = { 
      id: crypto.randomUUID(), 
      name: newItemName, 
      price: parseFloat(newItemPrice), 
      quantity: parseInt(newItemQty) || 1, 
      shares: {}, 
      isTaxable: true 
    };
    
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'bills', roomId), { items: arrayUnion(newItem) });
    setNewItemName(''); setNewItemPrice(''); setNewItemQty(1);
  };

  const updateShare = async (item, personId, delta) => {
    const isMe = personId === user.uid;
    if (!isMe && !isOwner) return; 
    const currentShares = item.shares?.[personId] || 0;
    let newShares = currentShares + delta;
    if (newShares < 0) newShares = 0;

    const otherShares = Object.entries(item.shares || {}).filter(([uid]) => uid !== personId).reduce((sum, [, count]) => sum + count, 0);
    if (delta > 0 && (otherShares + newShares > item.quantity)) return;

    const updatedShares = { ...(item.shares || {}) };
    if (newShares === 0) delete updatedShares[personId];
    else updatedShares[personId] = newShares;

    const newItems = items.map(i => i.id === item.id ? { ...i, shares: updatedShares } : i);
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'bills', roomId), { items: newItems });
  };

  const updateItemQuantity = async (item, newQty) => {
      if (!isOwner || newQty < 1) return;
      const newItems = items.map(i => i.id === item.id ? { ...i, quantity: newQty } : i);
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'bills', roomId), { items: newItems });
      setEditingItem(null);
  };

  const toggleTaxable = async (item) => {
    if (!isOwner) return;
    const newItems = items.map(i => i.id === item.id ? { ...i, isTaxable: !i.isTaxable } : i);
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'bills', roomId), { items: newItems });
  };

  const deleteItem = async (itemId) => {
    if (!isOwner) return;
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'bills', roomId), { items: items.filter(i => i.id !== itemId) });
  };

  const updateGlobal = async (field, val) => {
    if (!isOwner) return;
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'bills', roomId), { [field]: val });
  };

  // --- AI RECEIPT SCANNER ---
  const handleFileUpload = async (e) => {
    if (!isOwner) return;
    const file = e.target.files[0];
    if (!file) return;

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const base64Data = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(file);
      });

      let apiKey = process.env.REACT_APP_GEMINI_API_KEY;
      if (!apiKey) throw new Error("API Key Missing. Add REACT_APP_GEMINI_API_KEY to Vercel.");
      apiKey = apiKey.trim();

      const prompt = `
        Analyze this receipt. Return JSON: { "items": [{"name": "x", "price": 1.0, "quantity": 1, "isTaxable": true}], "totalTax": 0, "discount": 0 }
        
        RULES:
        1. PRICES: Use the FINAL price shown (green/bold). Do NOT calculate discounts.
        2. DISCOUNT: Scan for "Associate Discount" or "Total Savings" and put that value in the 'discount' field.
        3. QUANTITY: If "2 @ $3.00", Price = $6.00 (Total), Quantity = 2.
        4. IGNORE: "Add" buttons.
        5. TAX (Canada):
           - Taxable: Chips, Soda, Candy, Hot Food, Household, Hygiene.
           - Tax-Free: Produce, Meat, Dairy, Eggs, Bread, Basic Groceries.
      `;

      const modelsToTry = [
        'gemini-2.0-flash',        
        'gemini-2.0-flash-exp',    
        'gemini-2.5-flash',        
        'gemini-flash-latest'      
      ];

      let data;
      let success = false;
      let lastError = null;

      for (const model of modelsToTry) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
          
          const payload = {
            contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { mimeType: "image/jpeg", data: base64Data } }] }],
            generationConfig: { responseMimeType: "application/json" }
          };

          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          
          data = await response.json();
          if (data.candidates && data.candidates.length > 0) {
            success = true;
            break;
          }
        } catch (err) {
          lastError = err;
        }
      }

      if (!success) throw new Error(`Scan failed. Last error: ${lastError.message}`);

      let resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!resultText) throw new Error("No data from AI");
      
      resultText = resultText.replace(/```json|```/g, '').trim();
      const result = JSON.parse(resultText);

      const newItems = (result.items || []).map(i => ({
          id: crypto.randomUUID(), 
          name: i.name, 
          price: i.price, 
          quantity: i.quantity || 1, 
          isTaxable: i.isTaxable !== false, 
          shares: {}
      }));

      const existingItems = items || [];
      const filteredNewItems = newItems.filter(newItem => 
        !existingItems.some(existing => 
             existing.name === newItem.name && Math.abs(existing.price - newItem.price) < 0.01
        )
      );

      if (filteredNewItems.length === 0 && newItems.length > 0) {
          alert("No new items found. It looks like you already scanned this receipt!");
          setIsAnalyzing(false);
          return;
      }

      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'bills', roomId), {
          items: [...existingItems, ...filteredNewItems],
          tax: (result.totalTax || 0) + tax,
          discount: result.discount || discount 
      });

      setIsAnalyzing(false);
    } catch (err) {
      console.error(err);
      setAnalysisError(err.message);
      setIsAnalyzing(false);
    }
  };

  // --- CALCULATIONS (3 STRATEGIES) ---
  const calculateTotals = () => {
    const overallSubtotal = items.reduce((sum, i) => sum + i.price, 0);
    const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);
    
    const taxableItemsSum = items.filter(i => i.isTaxable).reduce((s, i) => s + i.price, 0);
    const effectiveTaxRate = taxableItemsSum > 0 ? tax / taxableItemsSum : 0;

    const discountRate = overallSubtotal > 0 ? discount / overallSubtotal : 0;

    // Pre-calculation for "Split by Amount"
    const totalClaimedSubtotal = items.reduce((total, item) => {
        const sharesMap = item.shares || {};
        const itemClaims = Object.values(sharesMap).reduce((a,b)=>a+b,0);
        // If no one claimed it, it doesn't contribute to the tax base for people
        if (itemClaims === 0) return total;
        return total + item.price; 
    }, 0);

    // Pre-calculation for "Split by Item Count"
    const taxPerItem = totalQuantity > 0 ? tax / totalQuantity : 0;

    let calculatedPeople = people.map(person => {
      let mySubtotal = 0;
      let myTax = 0;
      let myDiscount = 0;
      let myItemCount = 0;

      items.forEach(item => {
        const sharesMap = item.shares || {};
        const myShares = sharesMap[person.id] || 0;
        
        if (myShares > 0) {
          const totalShares = Object.values(sharesMap).reduce((a,b)=>a+b,0) || 1;
          
          // If shares > quantity, assume multi-buy (Unit Price * MyShares)
          // If shares <= quantity, assume split (Price * Fraction)
          // But here we stick to Unit Price logic for consistency with prev fix
          const unitPrice = item.price / item.quantity;
          const myCost = unitPrice * myShares;
          
          // Track Item Count Fraction (e.g. 1/7th of a Milk counts as 0.14 items)
          // This is crucial for "Split by Item Count" when items are shared
          const shareFraction = myShares / Math.max(item.quantity, totalShares);
          const myQuantityFraction = item.quantity * shareFraction; 
          // Wait, simpler: My Shares IS the quantity I took, effectively.
          // But if 7 people split 1 Milk (Qty 1), myShares is 1. TotalShares is 7.
          // I effectively took 1/7th of the item.
          // So myItemCount += (myShares / totalShares) * item.quantity
          
          myItemCount += (myShares / Math.max(totalShares, item.quantity)) * item.quantity;

          mySubtotal += myCost;
          
          // Strategy 1: Smart (Default)
          if (taxStrategy === 'smart' && item.isTaxable) {
              myTax += myCost * effectiveTaxRate;
          }
          
          myDiscount += myCost * discountRate; 
        }
      });
      
      return { 
        ...person,
        subtotal: mySubtotal, 
        tax: myTax, 
        discount: myDiscount,
        itemCount: myItemCount
      };
    });

    // Strategy 2: Proportional (By Amount)
    if (taxStrategy === 'proportional') {
        // Re-sum subtotal because above loop calculates it per person
        const actualTotalSubtotal = calculatedPeople.reduce((sum, p) => sum + p.subtotal, 0);
        calculatedPeople = calculatedPeople.map(person => ({
            ...person,
            tax: actualTotalSubtotal > 0 ? (person.subtotal / actualTotalSubtotal) * tax : 0
        }));
    }

    // Strategy 3: By Item Count (User Request)
    if (taxStrategy === 'item_count') {
        // Total Tax / Total Items * My Items
        // Note: This counts UNCLAIMED items in the denominator (Total Items)
        // So if items are unclaimed, some tax remains unpaid. This matches "Tax Per Item" logic.
        calculatedPeople = calculatedPeople.map(person => ({
            ...person,
            tax: person.itemCount * taxPerItem
        }));
    }

    // Penny Correction (Applies to ALL strategies to fix rounding)
    if (tax > 0) {
         calculatedPeople = calculatedPeople.map(p => ({ ...p, tax: Math.round(p.tax * 100) / 100 }));
         const currentTaxSum = calculatedPeople.reduce((sum, p) => sum + p.tax, 0);
         
         // Only run correction if we are aiming to pay the FULL tax (Smart & Proportional)
         // For Item Count, if items are unclaimed, we EXPECT tax to be lower than total.
         // But if all items ARE claimed, we should balance it.
         // Let's only balance if strategy isn't item_count OR if total claimed items ~= total items
         
         // Actually, safer to ALWAYS balance for Smart/Proportional.
         if (taxStrategy !== 'item_count') {
             const diff = Math.round((tax - currentTaxSum) * 100);
             if (diff !== 0) {
                 const sign = diff > 0 ? 1 : -1;
                 const count = Math.abs(diff);
                 calculatedPeople.sort((a, b) => b.subtotal - a.subtotal);
                 for (let i = 0; i < count; i++) {
                     calculatedPeople[i % calculatedPeople.length].tax += (0.01 * sign);
                 }
             }
         }
    }

    calculatedPeople = calculatedPeople.map(p => ({
        ...p,
        total: p.subtotal + p.tax
    }));

    return { 
        grandTotal: overallSubtotal + tax, 
        personTotals: calculatedPeople.map(p => ({
            ...p,
            subtotal: p.subtotal,
            tax: p.tax,
            discount: p.discount,
            total: p.total
        }))
    };
  };
  
  const { grandTotal, personTotals } = calculateTotals();

  // --- RENDER HELPERS ---
  const renderShareControl = (item, personId) => {
      const myShares = item.shares?.[personId] || 0;
      const totalClaimed = Object.values(item.shares || {}).reduce((a,b)=>a+b,0);
      const remaining = item.quantity - totalClaimed;
      const isMe = personId === user.uid;
      if (!isMe) return null; 

      if (myShares === 0) {
          return (
            <button 
                onClick={() => updateShare(item, personId, 1)}
                className={`w-full py-2 border rounded-lg font-bold text-sm flex items-center justify-center gap-2 bg-white border-gray-200 text-gray-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all`}
            >
                <Plus size={14} strokeWidth={3}/> Claim
            </button>
          );
      }

      return (
        <div className="flex items-center justify-between w-full bg-blue-50 rounded-lg p-1 border border-blue-100">
            <div className="flex items-center gap-1">
                <button onClick={() => updateShare(item, personId, -1)} className="w-8 h-8 flex items-center justify-center bg-white border border-blue-100 rounded-lg text-blue-600 shadow-sm"><Minus size={14}/></button>
                <span className="font-black text-lg w-8 text-center text-blue-700">{myShares}</span>
                <button onClick={() => updateShare(item, personId, 1)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-600 text-white"><Plus size={14}/></button>
            </div>
            <div className="text-right pr-2"><div className="text-[10px] text-blue-400 font-bold uppercase">YOU PAY</div><div className="text-blue-700 font-black text-sm">${((item.price / item.quantity) * myShares).toFixed(2)}</div></div>
        </div>
      );
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader className="animate-spin text-blue-600" /></div>;
  if (view === 'lobby') {
    return (
      <div className="max-w-md mx-auto bg-gray-50 min-h-screen flex flex-col p-6 justify-center font-sans">
        <div className="text-center mb-10">
            <div className="bg-gradient-to-tr from-blue-600 to-purple-600 text-white w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl rotate-3">
                <Receipt size={40} />
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900">SnapSplit</h1>
            <p className="text-gray-500 mt-2">Smart Canadian bill splitting.</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <input type="text" value={userName} onChange={e => setUserName(e.target.value)} placeholder="Your Name" className="w-full border border-gray-200 rounded-xl p-4 focus:ring-2 focus:ring-blue-500 outline-none" />
          <div className="pt-2">
            <button onClick={createRoom} disabled={isCreating} className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold hover:bg-black transition mb-3 flex items-center justify-center gap-2">{isCreating ? <Loader className="animate-spin"/> : <Plus size={20} />} New Bill</button>
            <div className="flex gap-2 mt-4"><input type="text" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} placeholder="CODE" className="w-24 border border-gray-200 rounded-xl p-3 text-center font-mono font-bold uppercase bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none" maxLength={6} /><button onClick={joinRoom} disabled={isCreating} className="flex-1 bg-blue-100 text-blue-700 py-3 rounded-xl font-bold hover:bg-blue-200 flex justify-center items-center gap-2">{isCreating ? <Loader size={18}/> : <LogIn size={18}/>} Join</button></div>
          </div>
          
          {installPrompt && (
             <button onClick={handleInstallClick} className="w-full mt-4 bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition flex items-center justify-center gap-2 shadow-md">
               <Download size={18} /> Install App
             </button>
          )}
          {error && (
            <div className="bg-red-50 p-3 rounded-xl flex items-start gap-2 text-red-600 text-sm">
              {error.includes('Permission') ? <AlertTriangle size={16} className="mt-0.5 flex-shrink-0"/> : <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />}
              <div><p className="font-bold">{error.split('!')[0]}</p><p className="font-normal">{error.split('!')[1]}</p></div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-gray-50 min-h-screen flex flex-col font-sans">
      <div className="bg-gray-900 text-white p-5 pt-8 rounded-b-3xl shadow-lg z-10">
        <div className="flex justify-between mb-4">
          <div><h1 className="font-bold text-xl">SnapSplit</h1><div className="flex items-center gap-2 mt-1"><span className="bg-gray-800 px-3 py-1 rounded-lg font-mono text-yellow-400 font-bold select-all">{roomId}</span><span className="text-xs text-gray-400">Code</span></div></div>
          <div className="text-right flex items-center gap-2">
              <div className="text-right"><div className="text-xs text-gray-400 mb-1">Total Bill</div><div className="font-bold text-2xl">${grandTotal.toFixed(2)}</div></div>
              <button onClick={leaveRoom} className="bg-gray-800 p-2 rounded-lg text-white hover:bg-red-600 transition-colors"><LogOut size={16} /></button>
          </div>
        </div>
        <div className="flex bg-gray-800 p-1 rounded-xl"><button onClick={() => setActiveTab('split')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${activeTab === 'split' ? 'bg-white text-gray-900' : 'text-gray-400'}`}>Items</button><button onClick={() => setActiveTab('summary')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${activeTab === 'summary' ? 'bg-white text-gray-900' : 'text-gray-400'}`}>Breakdown</button></div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 pb-24">
        {activeTab === 'split' && (
          <div className="space-y-6">
            {isOwner && (
              <div className="bg-blue-50 border-2 border-blue-100 border-dashed p-6 rounded-2xl text-center relative group cursor-pointer hover:bg-blue-100 transition-colors">
                {isAnalyzing ? <div className="flex flex-col items-center text-blue-600"><Loader className="animate-spin mb-2" /><span>Scanning...</span></div> : <><input type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" /><Camera className="mx-auto text-blue-500 mb-2 group-hover:scale-110 transition-transform" size={32} /><h3 className="font-bold text-blue-900">Scan Receipt</h3><p className="text-xs text-blue-400 mt-1">Auto-detects Qty & Tax</p></>}
                {analysisError && <p className="text-red-500 text-xs mt-2">{analysisError}</p>}
              </div>
            )}
            
            {/* CLEAR ITEMS BUTTON */}
            {isOwner && items.length > 0 && (
               <button onClick={clearItems} className="w-full text-red-500 text-xs font-medium flex items-center justify-center gap-1 hover:bg-red-50 p-2 rounded-lg transition-colors">
                 <Trash2 size={12}/> Clear All Items (Fix Bugged Room)
               </button>
            )}

            <div className="space-y-3">
              {items.map(item => {
                const sharesMap = item.shares || {};
                const totalClaimed = Object.values(sharesMap).reduce((a, b) => a + b, 0);
                const remaining = item.quantity - totalClaimed;
                return (
                  <div key={item.id} className={`bg-white p-4 rounded-2xl shadow-sm border-2 transition-all ${sharesMap[user.uid] > 0 ? 'border-blue-500 shadow-md' : 'border-transparent'}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="font-bold text-gray-900">{item.name}</div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-lg font-bold text-gray-900">${item.price.toFixed(2)}</span>
                          <button onClick={() => toggleTaxable(item)} disabled={!isOwner} className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${item.isTaxable ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-green-50 text-green-600 border-green-200'}`}>{item.isTaxable ? '+TAX' : 'NO TAX'}</button>
                          <button onClick={() => isOwner && setEditingItem(item.id)} className={`text-[10px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-1 ${parseInt(remaining) === 0 ? 'bg-gray-100 text-gray-500' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>QTY: {item.quantity} {isOwner && <Edit2 size={8}/>}</button>
                        </div>
                        {editingItem === item.id && (<div className="mt-2 flex items-center gap-2 bg-gray-50 p-1 rounded"><input type="number" autoFocus placeholder={item.quantity} className="w-16 border rounded p-1 text-sm" onKeyDown={(e) => { if (e.key === 'Enter') updateItemQuantity(item, parseInt(e.target.value)); }} /><button onClick={() => setEditingItem(null)} className="text-xs text-red-500 px-2">Cancel</button></div>)}
                      </div>
                      {isOwner && <button onClick={() => deleteItem(item.id)} className="text-gray-300 hover:text-red-500 p-1"><Trash2 size={16}/></button>}
                    </div>
                    
                    <div className="w-full bg-gray-100 h-1.5 rounded-full mb-3 overflow-hidden"><div className={`h-full transition-all ${parseInt(remaining) === 0 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${Math.min((Object.values(sharesMap).reduce((a,b)=>a+b,0)/item.quantity)*100, 100)}%` }}></div></div>
                    <div className="space-y-3">
                        {renderShareControl(item, user.uid)}
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(sharesMap).map(([uid, count]) => { 
                                const p = people.find(p => p.id === uid)?.name || 'Unknown'; 
                                const isMe = uid === user.uid;
                                return (
                                    <div key={uid} className={`flex items-center gap-1 px-2 py-1 rounded-md border ${isMe ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-100'}`}>
                                        <span className={`text-xs font-bold ${isMe ? 'text-blue-600' : 'text-gray-600'}`}>{p} {isMe && '(You)'}</span>
                                        <span className="text-xs bg-white px-1.5 rounded text-gray-400 font-mono border border-gray-100">x{count}</span>
                                    </div>
                                ); 
                            })}
                        </div>
                        
                        {Object.values(sharesMap).length === 0 && <span className="text-xs text-gray-300 italic block text-center">Unclaimed ({remaining} left)</span>}
                        {Object.values(sharesMap).length > 0 && remaining > 0 && <span className="text-xs text-blue-400 block text-center">{remaining} remaining</span>}
                        {parseInt(remaining) <= 0 && <span className="text-xs text-green-500 font-bold block text-center flex items-center justify-center gap-1"><Check size={10}/> Fully Claimed</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            {isOwner && (
               <div className="bg-gray-100 p-2 rounded-2xl flex items-center gap-2 shadow-inner"><input value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="Item Name" className="flex-[2] bg-white p-3 rounded-xl text-sm outline-none shadow-sm" /><input value={newItemQty} type="number" onChange={e => setNewItemQty(e.target.value)} placeholder="Qty" className="w-14 bg-white p-3 rounded-xl text-sm outline-none text-center shadow-sm" /><input value={newItemPrice} type="number" onChange={e => setNewItemPrice(e.target.value)} placeholder="$" className="w-20 bg-white p-3 rounded-xl text-sm outline-none shadow-sm" /><button onClick={addItem} className="bg-gray-900 text-white p-3 rounded-xl hover:bg-black transition shadow-md"><Plus size={18} /></button></div>
            )}

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-4"><Lock size={12} className="text-gray-300"/><h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Fees & Totals</h3></div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div><label className="text-xs text-gray-500 font-medium">Total Tax Paid</label><div className="relative mt-1"><DollarSign size={14} className="absolute left-3 top-3 text-gray-400"/><input type="number" value={tax} disabled={!isOwner} onChange={e => updateGlobal('tax', parseFloat(e.target.value)||0)} className="w-full pl-8 p-2 bg-gray-50 rounded-lg text-sm font-bold outline-none focus:ring-1 focus:ring-blue-500" /></div></div>
                <div><label className="text-xs text-gray-500 font-medium">Discount (Display Only)</label><div className="relative mt-1"><DollarSign size={14} className="absolute left-3 top-3 text-green-500"/><input type="number" value={discount} disabled={!isOwner} onChange={e => updateGlobal('discount', parseFloat(e.target.value)||0)} className="w-full pl-8 p-2 bg-green-50 text-green-700 rounded-lg text-sm font-bold outline-none focus:ring-1 focus:ring-green-500" /></div></div>
              </div>

              {/* TAX STRATEGY TOGGLE */}
              <div className="flex bg-gray-100 p-1 rounded-lg gap-1">
                  <button 
                    onClick={() => isOwner && updateGlobal('taxStrategy', 'smart')}
                    className={`flex-1 py-2 text-[10px] font-bold rounded-md transition-all flex flex-col items-center justify-center gap-1 ${taxStrategy === 'smart' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}
                  >
                    <Calculator size={14} /> Smart
                  </button>
                  <button 
                    onClick={() => isOwner && updateGlobal('taxStrategy', 'proportional')}
                    className={`flex-1 py-2 text-[10px] font-bold rounded-md transition-all flex flex-col items-center justify-center gap-1 ${taxStrategy === 'proportional' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}
                  >
                    <Percent size={14} /> By Price
                  </button>
                  <button 
                    onClick={() => isOwner && updateGlobal('taxStrategy', 'item_count')}
                    className={`flex-1 py-2 text-[10px] font-bold rounded-md transition-all flex flex-col items-center justify-center gap-1 ${taxStrategy === 'item_count' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}
                  >
                    <Hash size={14} /> By Item
                  </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'summary' && (
          <div className="space-y-4">
            {personTotals.map(p => (
              <div key={p.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-50"><div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${p.id === user.uid ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>{p.name.charAt(0)}</div><div><span className="font-bold text-gray-900 block">{p.name}</span>{p.id === user.uid && <span className="text-[10px] text-blue-500 font-bold uppercase tracking-wider">That's You</span>}</div></div><span className="text-2xl font-bold text-gray-900">${p.total.toFixed(2)}</span></div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{p.subtotal.toFixed(2)}</span></div>
                  <div className="flex justify-between text-gray-500">
                      <span>Tax Share {taxStrategy === 'proportional' ? '(By Price)' : taxStrategy === 'item_count' ? '(By Item)' : '(Smart)'}</span>
                      <span>+{p.tax.toFixed(2)}</span>
                  </div>
                  {p.discount > 0 && <div className="flex justify-between text-green-600"><span>Discount (Saved)</span><span>-{p.discount.toFixed(2)}</span></div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SnapSplit;