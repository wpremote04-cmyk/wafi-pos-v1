const $=id=>document.getElementById(id);
const money=n=>'Rp'+Number(n||0).toLocaleString('id-ID');
const today=()=>new Date().toISOString().slice(0,10);
const defaultSettings={
  name:'WAFI PRINTING',
  address:'Alamat toko',
  phone:'08xxxxxxxxxx',
  email:'',
  footer:'Terima kasih telah menggunakan jasa kami.',
  profileLogo:'wafilogo.png',
  invoiceLogo:'logo_kasir.png',
  loginLogoImage:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAzMAAAMACAYAAAAQRTm1AAAQAElEQVR4Aex9B4AlVZX2d6ree52nJ2cYco4KAoqKAXUNq6uirrqra1rXjAgIKjQgOWeGDILokBEQJIMgSBBBBEQkT57pnF6o+3/fqaqeHsT91TUMUDX31Mnn3jqvwjmvunsiFFuRgSIDRQaKDBQZKDJQZKDIQJGBIgNFBl6GGSiamZfhh1Ys+Z+ZgWLuIgNFBooMFBkoMlBkoMhAkYE1JQNFM7OmfBLFOooMFBkoMvBKzEBxTEUGigwUGSgyUGTg75iBopn5Oya3CF1koMhAkYEiA0UGigwUGfhLMlDYFhkoMvCXZaBoZv6yfBXWRQaKDBQZKDJQZKDIQJGBIgNFBooMrBkZQNHMrCEfRLGMIgNFBooMFBkoMlBkoMhAkYEiA0UG/rIMFM3MX5avwvrVnoHi+IsMFBkoMlBkoMhAkYEiA0UG1pgMFM3MGvNRFAspMlBkoMjAKy8DxREVGSgyUGSgyECRgb9nBopm5u+Z3SJ2kYEiA0UGigwUGSgyUGTgz89AYVlkoMjAX5iBopn5CxNWmBcZKDJQZKDIQJGB',
  receiptShowBarcode:true,
  receiptShowOrderNoBelowBarcode:true,
  loginBackgroundImage:'',
  loginBackgroundOverlay:60,
  loginBackgroundBlur:0,
  loginBackgroundBrightness:1,
  loginAccentColor:'#1db9db'
};
const AUTH_DEFAULT_USERNAME='admin';
const AUTH_DEFAULT_PASSWORD='admin123';
function shadeColor(hex, percent){
  const clean = (hex || '#1db9db').replace('#','');
  const num = parseInt(clean.length === 3 ? clean.split('').map(ch => ch + ch).join('') : clean, 16);
  const amt = Math.round(2.55 * percent);
  const r = (num >> 16) + amt;
  const g = ((num >> 8) & 0x00FF) + amt;
  const b = (num & 0x0000FF) + amt;
  return '#' + [r,g,b].map(value => Math.max(0, Math.min(255, value)).toString(16).padStart(2,'0')).join('');
}
function simpleHash(text=''){
  let hash=0;
  for(let i=0;i<text.length;i++) hash=(hash<<5)-hash+text.charCodeAt(i),hash|=0;
  return String(Math.abs(hash)).padStart(8,'0');
}
async function hashPassword(text=''){
  return simpleHash(String(text||''));
}
const createFreshDB=()=>({settings:{...defaultSettings},products:[],sales:[],customers:[],userActivity:[],meta:{orderSequence:0},auth:{session:null,accounts:[{id:1,username:AUTH_DEFAULT_USERNAME,passwordHash:simpleHash(AUTH_DEFAULT_PASSWORD)}]}});
let db=JSON.parse(localStorage.getItem('wafi_printing_db')||'null')||createFreshDB();
function normalizeAuth(){
  db.auth=db.auth||{};
  db.auth.accounts=(db.auth.accounts||[]).map((acc,index)=>({
    id:acc.id || Date.now()+index,
    username:(acc.username||AUTH_DEFAULT_USERNAME).trim(),
    passwordHash:acc.passwordHash || simpleHash(AUTH_DEFAULT_PASSWORD)
  }));
  if(!db.auth.accounts.length){
    db.auth.accounts=[{id:Date.now(),username:AUTH_DEFAULT_USERNAME,passwordHash:simpleHash(AUTH_DEFAULT_PASSWORD)}];
  }
  db.auth.session=db.auth.session||null;
  db.auth.rememberedUsername = db.auth.rememberedUsername ? String(db.auth.rememberedUsername).trim() : '';
}
function normalizeAccountPasswords(){
  db.auth.accounts=db.auth.accounts.map(acc=>({
    ...acc,
    passwordHash:String(acc.passwordHash || '').trim() || simpleHash(AUTH_DEFAULT_PASSWORD)
  }));
}
function normalizeProducts(){
  db.products=(db.products||[]).map((p,index)=>({
    id:p.id || Date.now()+index,
    code:(p.code||p.kode||`BRG${String(index+1).padStart(3,'0')}`).toUpperCase(),
    name:p.name||'',
    buyPrice:Number(p.buyPrice ?? p.hargaBeli ?? p.purchasePrice ?? p.price ?? 0),
    sellPrice:Number(p.sellPrice ?? p.hargaJual ?? p.price ?? 0),
    stockAwal:Number(p.stockAwal ?? p.stokAwal ?? p.stock ?? p.stok ?? 0),
    sisaStok:Number(p.sisaStok ?? p.stok ?? p.stock ?? p.stockAwal ?? p.stokAwal ?? 0)
  }));
}
normalizeProducts();
normalizeAuth();
normalizeAccountPasswords();
function normalizeSettings(){
  db.settings={...defaultSettings,...(db.settings||{})};
  db.settings.email = String(db.settings.email || '').trim();
  db.settings.loginLogoImage = db.settings.loginLogoImage || defaultSettings.loginLogoImage;
  db.settings.receiptShowBarcode=db.settings.receiptShowBarcode!==false;
  db.settings.receiptShowOrderNoBelowBarcode=db.settings.receiptShowOrderNoBelowBarcode!==false;
  db.settings.loginBackgroundOverlay=Number(db.settings.loginBackgroundOverlay ?? 60);
  db.settings.loginBackgroundBlur=Number(db.settings.loginBackgroundBlur ?? 0);
  db.settings.loginBackgroundBrightness=Number(db.settings.loginBackgroundBrightness ?? 1);
}
function buildCustomerDirectoryFromSales(){
  const map=new Map();
  (db.sales||[]).forEach(sale=>{
    const name=(sale.customer||'Umum').trim() || 'Umum';
    const phone=String(sale.phone||'').trim();
    const orderNo=String(sale.no || '').trim();
    const key=`${name.toLowerCase()}|${phone.toLowerCase()}`;
    const current=map.get(key) || {
        id: Date.now() + Math.random(),
        name,
        phone,
        orderNo,
        company:'',
        notes:'',
        totalTransactions:0,
        totalSpending:0,
        lastVisit:sale.date || new Date().toISOString()
      };
    current.orderNo = orderNo || current.orderNo || '';
    current.totalTransactions += 1;
    current.totalSpending += Number(sale.total || 0);
    const saleDate = new Date(sale.date || current.lastVisit);
    const lastVisitDate = new Date(current.lastVisit);
    if(saleDate > lastVisitDate) current.lastVisit = sale.date || current.lastVisit;
    map.set(key,current);
  });
  return [...map.values()].sort((a,b)=>new Date(b.lastVisit)-new Date(a.lastVisit));
}
function resolveCustomerOrderNumber(customer={}){
  const directOrder = String(customer.orderNo || customer.no || '').trim();
  if(directOrder) return directOrder;
  const customerName = String(customer.name || 'Umum').trim().toLowerCase();
  const customerPhone = String(customer.phone || '').trim();
  const matchedSale = (db.sales || []).find(sale => {
    const saleName = String(sale.customer || 'Umum').trim().toLowerCase();
    const salePhone = String(sale.phone || '').trim();
    return saleName === customerName && (!customerPhone || salePhone === customerPhone);
  });
  return matchedSale && String(matchedSale.no || '').trim() ? String(matchedSale.no || '').trim() : '-';
}

function normalizeCustomers(){
  db.customers=(db.customers||[]).map((customer,index)=>({
    id: customer.id || Date.now()+index,
    name:String(customer.name || 'Umum').trim() || 'Umum',
    phone:String(customer.phone || '').trim(),
    orderNo:String(customer.orderNo || customer.no || '').trim() || resolveCustomerOrderNumber(customer),
    company:String(customer.company || '').trim(),
    notes:String(customer.notes || '').trim(),
    totalTransactions:Number(customer.totalTransactions || 0),
    totalSpending:Number(customer.totalSpending || 0),
    lastVisit:customer.lastVisit || new Date().toISOString()
  }));
  if(!db.customers.length){
    db.customers=buildCustomerDirectoryFromSales();
  }
}
function normalizeUserActivity(){
  db.userActivity=(db.userActivity||[]).map((entry,index)=>({
    id: entry.id || Date.now()+index,
    username:String(entry.username || 'system').trim() || 'system',
    action:String(entry.action || 'Aktivitas').trim(),
    detail:String(entry.detail || '').trim(),
    timestamp: entry.timestamp || new Date().toISOString()
  })).sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp)).slice(0,50);
}
normalizeSettings();
normalizeCustomers();
normalizeUserActivity();
let cart=[], editProductId=null, importPreviewRows=[], importValidationErrors=[], selectedProductIds=new Set(), currentTransactionFilter='Semua';
function saveDB(){localStorage.setItem('wafi_printing_db',JSON.stringify(db))}

function updateProductBulkButtons(){
  const selectedCount=selectedProductIds.size;
  const anyProducts=db.products.length>0;
  const deleteSelected=$('deleteSelectedProducts');
  const deleteAll=$('deleteAllProducts');
  const selectAll=$('selectAllProducts');
  if(deleteSelected) deleteSelected.disabled = selectedCount===0;
  if(deleteAll) deleteAll.disabled = !anyProducts;
  if(selectAll) selectAll.checked = anyProducts && db.products.length>0 && db.products.every(p=>selectedProductIds.has(p.id));
  if(selectAll) selectAll.indeterminate = !selectAll.checked && selectedCount>0 && selectedCount < db.products.length;
}

function toggleProductSelection(id, checked){
  if(checked) selectedProductIds.add(id); else selectedProductIds.delete(id);
  updateProductBulkButtons();
  renderProducts();
}

function deleteSelectedProducts(){
  const ids=[...selectedProductIds];
  if(!ids.length){ notify('Pilih minimal satu barang terlebih dahulu.', 'error'); return; }
  if(!confirm(`Hapus ${ids.length} barang terpilih?`)) return;
  db.products=db.products.filter(p=>!selectedProductIds.has(p.id));
  selectedProductIds.clear();
  saveDB();
  renderProducts();
  renderSelect();
  renderReport();
  notify('Barang terpilih berhasil dihapus.', 'success');
}

function deleteAllProducts(){
  if(!db.products.length){ notify('Belum ada barang untuk dihapus.', 'error'); return; }
  if(!confirm('Hapus semua barang? Tindakan ini tidak bisa dibatalkan.')) return;
  db.products=[];
  selectedProductIds.clear();
  saveDB();
  renderProducts();
  renderSelect();
  renderReport();
  notify('Semua barang berhasil dihapus.', 'success');
}

function normalizeImportHeader(value=''){
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
}

function parseImportNumeric(value){
  if(value===null || value===undefined || String(value).trim()==='') return null;
  const clean=String(value).trim().replace(/Rp/gi,'').replace(/\s+/g,'').replace(/\./g,'').replace(/,/g,'.').replace(/[^\d.-]/g,'');
  if(clean==='' || Number.isNaN(Number(clean))) return null;
  return Number(clean);
}

function buildImportFieldMap(headers){
  const aliases={
    code:['kode barang','kode','kode_barang','code'],
    name:['nama barang','nama','nama_barang','name'],
    buyPrice:['harga beli','harga_beli','harga beli barang','buy price','buyprice','buy_price'],
    sellPrice:['harga jual','harga_jual','harga jual barang','sell price','sellprice','sell_price'],
    stockAwal:['stok awal','stok_awal','sisa stok','stock awal','stock','stock_awal','stok']
  };
  const map={};
  Object.keys(aliases).forEach(key=>{
    const index=headers.findIndex(header=>aliases[key].includes(normalizeImportHeader(header)));
    if(index!==-1) map[key]=index;
  });
  return map;
}

function prepareImportRows(rawRows=[]){
  if(!Array.isArray(rawRows) || !rawRows.length) return {rows:[],errors:['File Excel tidak berisi data barang.']};
  const headerRow=Object.keys(rawRows[0]||{});
  if(!headerRow.length) return {rows:[],errors:['Header kolom tidak ditemukan di sheet Excel.']};
  const fieldMap=buildImportFieldMap(headerRow);
  const missing=Object.entries({code:'Kode Barang',name:'Nama Barang',buyPrice:'Harga Beli',sellPrice:'Harga Jual',stockAwal:'Stok Awal'}).filter(([key])=>fieldMap[key]===undefined).map(([,label])=>label);
  if(missing.length){
    return {rows:[],errors:[`Kolom wajib tidak ditemukan: ${missing.join(', ')}`]};
  }
  const rows=[];
  const errors=[];
  rawRows.forEach((row,index)=>{
    const rowNumber=index+2;
    const code=String(row[headerRow[fieldMap.code]] ?? '').trim();
    const name=String(row[headerRow[fieldMap.name]] ?? '').trim();
    const buyPrice=parseImportNumeric(row[headerRow[fieldMap.buyPrice]]);
    const sellPrice=parseImportNumeric(row[headerRow[fieldMap.sellPrice]]);
    const stockAwal=parseImportNumeric(row[headerRow[fieldMap.stockAwal]]);
    if(!code) errors.push(`Baris ${rowNumber}: Kode barang wajib diisi.`);
    if(!name) errors.push(`Baris ${rowNumber}: Nama barang wajib diisi.`);
    if(buyPrice===null || !Number.isFinite(buyPrice) || buyPrice < 0) errors.push(`Baris ${rowNumber}: Harga beli harus angka valid dan tidak negatif.`);
    if(sellPrice===null || !Number.isFinite(sellPrice) || sellPrice < 0) errors.push(`Baris ${rowNumber}: Harga jual harus angka valid dan tidak negatif.`);
    if(stockAwal===null || !Number.isFinite(stockAwal) || stockAwal < 0) errors.push(`Baris ${rowNumber}: Stok awal harus angka valid dan tidak negatif.`);
    if(code && name && buyPrice!==null && sellPrice!==null && stockAwal!==null){
      rows.push({code:code.toUpperCase(),name,buyPrice,sellPrice,stockAwal,sisaStok:stockAwal});
    }
  });
  const seen=new Set();
  rows.forEach((row,index)=>{
    const key=row.code.toUpperCase();
    if(seen.has(key)) errors.push(`Baris ${index+2}: Kode barang "${row.code}" duplikat dalam file Excel.`);
    seen.add(key);
  });
  return {rows,errors};
}

function renderImportPreview(rows=[]){
  const body=$('importPreviewBody');
  const summary=$('importValidationSummary');
  const errorList=$('importErrorList');
  const confirmBtn=$('importConfirmBtn');
  if(!rows.length){
    body.innerHTML=`<tr><td colspan="5" style="text-align:center;color:#6b7280;">Tidak ada data untuk dipreview.</td></tr>`;
    summary.innerHTML='<div class="import-summary error">Format file tidak valid.</div>';
    errorList.classList.remove('hidden');
    errorList.innerHTML=importValidationErrors.map(err=>`<li>${esc(err)}</li>`).join('');
    confirmBtn.classList.add('hidden');
    return;
  }
  body.innerHTML=rows.map(row=>`<tr><td>${esc(row.code)}</td><td>${esc(row.name)}</td><td>${money(row.buyPrice)}</td><td>${money(row.sellPrice)}</td><td>${row.stockAwal}</td></tr>`).join('');
  summary.innerHTML=`<div class="import-summary success">Format valid. ${rows.length} data barang siap diimport.</div>`;
  errorList.classList.add('hidden');
  errorList.innerHTML='';
  confirmBtn.classList.remove('hidden');
}

function openImportModalWithData(rows=[],errors=[]){
  importPreviewRows=rows;
  importValidationErrors=errors;
  const modal=$('importSheetModal');
  const confirmBtn=$('importConfirmBtn');
  if(errors.length){
    renderImportPreview([]);
    modal.classList.remove('hidden');
    return;
  }
  renderImportPreview(rows);
  modal.classList.remove('hidden');
  confirmBtn.onclick=applyImportedProducts;
}

function importExcelFile(file){
  if(!file) return;
  if(typeof XLSX==='undefined') return alert('Fitur Excel memerlukan koneksi internet untuk memuat library XLSX.');
  const reader=new FileReader();
  reader.onload=function(event){
    try{
      const workbook=XLSX.read(event.target.result,{type:'array'});
      const firstSheetName=workbook.SheetNames[0];
      const sheet=workbook.Sheets[firstSheetName];
      if(!sheet) return alert('File Excel tidak berisi sheet data.');
      const rawRows=XLSX.utils.sheet_to_json(sheet,{defval:'',raw:false,blankrows:false});
      const prepared=prepareImportRows(rawRows);
      if(prepared.errors.length){
        openImportModalWithData([], prepared.errors);
        return;
      }
      openImportModalWithData(prepared.rows,[]);
    }catch(error){
      notify('Format file Excel tidak valid.', 'error');
    }
  };
  reader.readAsArrayBuffer(file);
}

function applyImportedProducts(){
  if(!importPreviewRows.length){
    notify('Tidak ada data yang siap diimport.', 'error');
    return;
  }
  let importedCount=0;
  importPreviewRows.forEach(row=>{
    const existing=db.products.find(product=>product.code.toUpperCase()===row.code.toUpperCase());
    if(existing){
      existing.name=row.name;
      existing.buyPrice=row.buyPrice;
      existing.sellPrice=row.sellPrice;
      existing.stockAwal=row.stockAwal;
      existing.sisaStok=row.sisaStok;
      importedCount++;
      return;
    }
    db.products.push({
      id:Date.now()+Math.random(),
      code:row.code,
      name:row.name,
      buyPrice:row.buyPrice,
      sellPrice:row.sellPrice,
      stockAwal:row.stockAwal,
      sisaStok:row.sisaStok
    });
    importedCount++;
  });
  saveDB();
  $('excelImportInput').value='';
  $('importSheetModal').classList.add('hidden');
  renderProducts();
  renderSelect();
  renderReport();
  notify(`${importedCount} data barang berhasil diimport.`, 'success');
}

function exportProductsToExcel(){
  if(typeof XLSX==='undefined') return alert('Fitur Excel memerlukan koneksi internet untuk memuat library XLSX.');
  const rows=db.products.map(product=>({
    'Kode Barang':product.code,
    'Nama Barang':product.name,
    'Harga Beli':Number(product.buyPrice||0),
    'Harga Jual':Number(product.sellPrice||0),
    'Stok Awal':Number(product.stockAwal||0),
    'Sisa Stok':Number(product.sisaStok||0)
  }));
  const ws=XLSX.utils.json_to_sheet(rows.length ? rows : [{ 'Kode Barang':'', 'Nama Barang':'', 'Harga Beli':'', 'Harga Jual':'', 'Stok Awal':'', 'Sisa Stok':'' }]);
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Barang');
  XLSX.writeFile(wb,'data-barang-wafi.xlsx');
  notify('File Excel barang berhasil diekspor.', 'success');
}

function downloadProductTemplate(){
  if(typeof XLSX==='undefined') return alert('Fitur Excel memerlukan koneksi internet untuk memuat library XLSX.');
  const template=[
    { 'Kode Barang':'BRG001','Nama Barang':'Contoh Produk 1','Harga Beli':12000,'Harga Jual':15000,'Stok Awal':50,'Sisa Stok':50 },
    { 'Kode Barang':'BRG002','Nama Barang':'Contoh Produk 2','Harga Beli':25000,'Harga Jual':35000,'Stok Awal':20,'Sisa Stok':20 }
  ];
  const ws=XLSX.utils.json_to_sheet(template);
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Barang');
  XLSX.writeFile(wb,'template-import-barang.xlsx');
  notify('Template Excel barang berhasil diunduh.', 'success');
}
function notify(message,type='success'){
  const toast=$('toast');
  if(!toast) return;
  toast.className=`toast ${type}`;
  toast.textContent=message;
  toast.classList.add('show');
  clearTimeout(notify.timer);
  notify.timer=setTimeout(()=>toast.classList.remove('show'),3000);
}
function getSessionUser(){return db.auth?.session?.username || null}
function isLoggedIn(){return Boolean(getSessionUser())}
function logUserActivity(action, detail='', username=getSessionUser()){
  const entry={
    id: Date.now() + Math.random(),
    username: username || 'system',
    action: String(action || 'Aktivitas').trim() || 'Aktivitas',
    detail: String(detail || '').trim(),
    timestamp: new Date().toISOString()
  };
  db.userActivity = [entry, ...(db.userActivity || [])].slice(0, 50);
  saveDB();
  renderUserActivity();
}
function setAuthOverlay(){
  const overlay=$('authOverlay');
  const userName=$('currentUserName');
  if(!overlay) return;
  if(isLoggedIn()){
    overlay.classList.add('hidden');
    if(userName) userName.textContent=`Login aktif: ${getSessionUser()}`;
  } else {
    overlay.classList.remove('hidden');
    if(userName) userName.textContent='Login aktif: belum login';
  }
}
function updateAuthStatus(){
  const loginBadge=$('loginBadge');
  const userName=$('currentUserName');
  const statusBadge=$('accountStatusBadge');
  const isActive=isLoggedIn();
  if(loginBadge) loginBadge.textContent=isActive?`Pengguna: ${getSessionUser()}`:'Belum login';
  if(userName) userName.textContent=isActive?`Login aktif: ${getSessionUser()}`:'Login aktif: belum login';
  if(statusBadge){
    statusBadge.textContent=isActive?'Aktif':'Belum Login';
    statusBadge.classList.toggle('active', isActive);
    statusBadge.classList.toggle('inactive', !isActive);
  }
  syncAccountDisplay();
  setAuthOverlay();
  renderCustomerDirectory();
  renderUserActivity();
}
function readFileAsDataUrl(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('Gagal membaca file gambar'));reader.readAsDataURL(file);})}
function getPasswordStrength(password=''){
  const value=password.trim();
  if(!value) return { score:0, label:'Belum diisi', level:'weak' };
  let score=0;
  if(value.length >= 4) score += 1;
  if(/[A-Z]/.test(value)) score += 1;
  if(/[0-9]/.test(value)) score += 1;
  if(/[^A-Za-z0-9]/.test(value)) score += 1;
  if(score <= 1) return { score, label:'Lemah', level:'weak' };
  if(score === 2 || score === 3) return { score, label:'Cukup', level:'medium' };
  return { score, label:'Kuat', level:'strong' };
}
function updatePasswordStrength(){
  const input=$('newPassword');
  const bar=$('passwordStrengthBar');
  const text=$('passwordStrengthText');
  if(!input || !bar || !text) return;
  const strength=getPasswordStrength(input.value);
  const width=(strength.score / 4) * 100;
  bar.parentElement.dataset.level=strength.level;
  bar.style.width=`${Math.max(width, strength.value ? 10 : 0)}%`;
  text.textContent=strength.label;
  text.style.color = strength.level === 'weak' ? '#b91c1c' : strength.level === 'medium' ? '#b45309' : '#166534';
}
function validateConfirmPassword(){
  const confirmInput=$('confirmPassword');
  const hint=$('confirmPasswordHint');
  const confirmField=confirmInput?.closest('.confirm-field');
  if(!confirmInput || !hint || !confirmField) return;
  const matched = !confirmInput.value || confirmInput.value === ($('newPassword')?.value || '');
  confirmField.classList.toggle('invalid', Boolean(confirmInput.value) && !matched);
  confirmField.classList.toggle('valid', Boolean(confirmInput.value) && matched);
  hint.textContent = matched ? 'Password cocok.' : 'Konfirmasi password tidak cocok.';
  hint.classList.toggle('error', Boolean(confirmInput.value) && !matched);
  hint.classList.toggle('success', Boolean(confirmInput.value) && matched);
}
function syncAccountDisplay(){
  const username=getSessionUser();
  const accountUsernameDisplay=$('accountUsernameDisplay');
  const statusBadge=$('accountStatusBadge');
  if(accountUsernameDisplay){ accountUsernameDisplay.textContent = username ? username : 'Belum login'; }
  if(statusBadge){
    const isActive=Boolean(username);
    statusBadge.textContent=isActive?'Aktif':'Belum Login';
    statusBadge.classList.toggle('active', isActive);
    statusBadge.classList.toggle('inactive', !isActive);
  }
}
function renderCustomerDirectory(){
  const container=$('customerDirectoryBody');
  if(!container) return;
  const rows=(db.customers && db.customers.length ? db.customers : buildCustomerDirectoryFromSales()).slice(0,8);
  if(!rows.length){
    container.innerHTML='<tr><td colspan="5" style="text-align:center;color:#6b7280;">Belum ada data pelanggan.</td></tr>';
    return;
  }
  const totalSpending = rows.reduce((sum, customer)=>sum + Number(customer.totalSpending || 0), 0);
  container.innerHTML=rows.map(customer => {
    const customerOrder = String(customer.orderNo || customer.no || resolveCustomerOrderNumber(customer) || '-').trim();
    return `<tr><td>${esc(customerOrder === '-' ? '-' : customerOrder)}</td><td>${esc(customer.name || 'Umum')}</td><td>${esc(customer.phone || '-')}</td><td>${money(Number(customer.totalSpending || 0))}</td><td>${new Date(customer.lastVisit || Date.now()).toLocaleDateString('id-ID')}</td></tr>`;
  }).join('') + (rows.length >= 8 ? `<tr><td colspan="5" style="text-align:right;color:#6b7280;">Total penjualan pelanggan: ${money(totalSpending)}</td></tr>` : '');
}
function renderUserActivity(){
  const list=$('userActivityList');
  if(!list) return;
  const activities=(db.userActivity || []).slice(0,8);
  if(!activities.length){
    list.innerHTML='<div class="activity-item empty">Belum ada aktivitas pengguna.</div>';
    return;
  }
  list.innerHTML=activities.map(activity=>`<div class="activity-item"><div class="activity-top"><strong>${esc(activity.username || 'system')}</strong><span>${new Date(activity.timestamp || Date.now()).toLocaleString('id-ID')}</span></div><div class="activity-action">${esc(activity.action || 'Aktivitas')}</div><div class="activity-detail">${esc(activity.detail || '-')}</div></div>`).join('');
}
function togglePasswordVisibility(button){
  const targetId=button?.dataset?.target;
  const input=document.getElementById(targetId);
  if(!input) return;
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  button.setAttribute('aria-label', show ? `Sembunyikan ${targetId}` : `Lihat ${targetId}`);
  button.classList.toggle('visible', show);
}
function formatDateTimeLocal(date=new Date()){
  const pad=n=>String(n).padStart(2,'0');
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
function updateOrderDateTime(){if($('orderDate'))$('orderDate').value=formatDateTimeLocal(new Date());}
function orderNumber(){
  db.meta=db.meta||{};
  const next=(Number(db.meta.orderSequence)||0)+1;
  db.meta.orderSequence=next;
  saveDB();
  return `WP-${String(next).padStart(6,'0')}`;
}
function init(){
  $('orderNo').value=orderNumber(); updateOrderDateTime();
  loadSettings(); renderProducts(); renderSelect(); renderCustomerSuggestions(); renderCart(); renderTransactions(); renderReport(); renderCustomerDirectory(); renderUserActivity(); initDashboardChartControls(); updateClock();
  document.querySelectorAll('.nav').forEach(b=>b.onclick=()=>showPage(b.dataset.page));
  $('addItem').onclick=addItem; $('discount').oninput=renderCart; $('downPayment').oninput=renderCart; $('paid').oninput=renderCart;
  $('customer').oninput=()=>{const val=($('customer').value||'').trim().toLowerCase(); const match=(db.sales||[]).find(s=>s.customer.toLowerCase()===val); if(match) $('phone').value=match.phone||'';};
  $('saveSale').onclick=saveSale; $('clearSale').onclick=clearSale;
  $('newProduct').onclick=()=>openProduct(); $('modalCancel').onclick=closeModal; $('modalSave').onclick=saveProduct;
  $('searchProduct').oninput=renderProducts;
  $('exportProductsExcel').onclick=exportProductsToExcel; $('downloadProductTemplate').onclick=downloadProductTemplate; $('importProductsExcel').onclick=()=>$('excelImportInput').click(); $('excelImportInput').onchange=event=>importExcelFile(event.target.files?.[0]); $('importPreviewCancel').onclick=()=>$('importSheetModal').classList.add('hidden'); $('importConfirmBtn').onclick=applyImportedProducts;
  $('deleteSelectedProducts').onclick=deleteSelectedProducts; $('deleteAllProducts').onclick=deleteAllProducts; $('selectAllProducts').onchange=event=>{
    const checked=event.target.checked;
    db.products.forEach(p=>{ if(checked) selectedProductIds.add(p.id); else selectedProductIds.delete(p.id); });
    updateProductBulkButtons();
    renderProducts();
  };
  $('searchTransaction').oninput=renderTransactions; $('transactionFilters').onclick=(event)=>{const button=event.target.closest('[data-filter]'); if(button){ currentTransactionFilter=button.dataset.filter; renderTransactions(); }}; $('clearTransactions').onclick=()=>{if(confirm('Hapus semua transaksi?')){db.sales=[];saveDB();renderTransactions();renderReport()}}; $('transactionEditCancel').onclick=closeTransactionEditModal; $('transactionEditSave').onclick=saveTransactionEdit;
  $('saveSettings').onclick=saveSettings; $('resetData').onclick=resetAllData; $('backupBtn').onclick=backup; $('printReport').onclick=printReport;
  if($('saveLoginAppearanceBtn')) $('saveLoginAppearanceBtn').onclick=saveLoginAppearance;
  if($('resetLoginAppearanceBtn')) $('resetLoginAppearanceBtn').onclick=resetLoginAppearance;
  $('loginForm').onsubmit=handleLogin; $('logoutBtn').onclick=handleLogout; $('changePasswordForm').onsubmit=handleChangePassword; $('resetDefaultAccountBtn').onclick=()=>{ if(confirm('Reset akun default akan mengembalikan username dan password ke admin/admin123. Lanjutkan?')) resetDefaultAccount(); };
  document.querySelectorAll('.toggle-password').forEach(button=>button.onclick=()=>togglePasswordVisibility(button));
  const newPassword=$('newPassword');
  const confirmPassword=$('confirmPassword');
  if(newPassword){ newPassword.oninput=()=>{ updatePasswordStrength(); validateConfirmPassword(); }; }
  if(confirmPassword){ confirmPassword.oninput=validateConfirmPassword; }
  document.addEventListener('keydown',handleQuickEnter);
  if($('loginUsername')) $('loginUsername').value = '';
  updateConnectionStatus();
  updateAuthStatus();
  syncAccountDisplay();
  window.addEventListener('online',updateConnectionStatus);
  window.addEventListener('offline',updateConnectionStatus);
  setInterval(updateClock,1000); setInterval(updateOrderDateTime,1000);
}
function showLoginError(show=true, message='? Username atau password tidak sesuai.'){
  const error=$('loginError');
  if(!error) return;
  error.textContent=message;
  error.classList.toggle('hidden', !show);
}

async function handleLogin(event){
  event.preventDefault();
  const submitBtn=$('loginForm')?.querySelector('.auth-submit');
  const btnLabel=submitBtn?.querySelector('.btn-label');
  const btnSpinner=submitBtn?.querySelector('.btn-spinner');
  if(submitBtn){ submitBtn.disabled=true; submitBtn.classList.add('is-loading'); }
  if(btnLabel) btnLabel.textContent='Memproses...';
  if(btnSpinner) btnSpinner.classList.remove('hidden');

  const username=($('loginUsername').value||'').trim();
  const password=($('loginPassword').value||'').trim();
  const shouldRemember=false;
  const account=db.auth.accounts.find(x=>x.username.toLowerCase()===username.toLowerCase());
  if(!account){
    if(submitBtn){ submitBtn.disabled=false; submitBtn.classList.remove('is-loading'); }
    if(btnLabel) btnLabel.textContent='LOGIN';
    if(btnSpinner) btnSpinner.classList.add('hidden');
    showLoginError(true);
    notify('Username atau password tidak sesuai.', 'error');
    return;
  }

  const hashed=await hashPassword(password);
  if(account.passwordHash!==hashed){
    if(submitBtn){ submitBtn.disabled=false; submitBtn.classList.remove('is-loading'); }
    if(btnLabel) btnLabel.textContent='LOGIN';
    if(btnSpinner) btnSpinner.classList.add('hidden');
    showLoginError(true);
    notify('Username atau password tidak sesuai.', 'error');
    return;
  }

  db.auth.session={username:account.username,loggedInAt:new Date().toISOString()};
  db.auth.rememberedUsername = '';
  saveDB();
  logUserActivity('Login berhasil', `Pengguna ${account.username} masuk ke sistem.`, account.username);
  $('loginUsername').value = '';
  $('loginPassword').value='';
  showLoginError(false);
  updateAuthStatus();
  notify('Login berhasil.', 'success');
  if(submitBtn){ submitBtn.disabled=false; submitBtn.classList.remove('is-loading'); }
  if(btnLabel) btnLabel.textContent='LOGIN';
  if(btnSpinner) btnSpinner.classList.add('hidden');
}

function handleLogout(){
  const currentUser=getSessionUser();
  db.auth.session=null;
  saveDB();
  if(currentUser) logUserActivity('Logout', `Pengguna ${currentUser} keluar dari sistem.`, currentUser);
  $('oldPassword').value='';
  $('newPassword').value='';
  $('confirmPassword').value='';
  $('loginPassword').value='';
  showLoginError(false);
  updateAuthStatus();
  notify('Logout berhasil.', 'success');
}

async function resetDefaultAccount(){
  if(!confirm('Reset akun default akan mengembalikan username dan password ke admin/admin123. Lanjutkan?'))return;
  const defaultHash=await hashPassword(AUTH_DEFAULT_PASSWORD);
  db.auth.accounts=[{id:1,username:AUTH_DEFAULT_USERNAME,passwordHash:defaultHash}];
  db.auth.session=null;
  $('oldPassword').value='';
  $('newPassword').value='';
  $('confirmPassword').value='';
  saveDB();
  logUserActivity('Reset akun default', 'Akun default dikembalikan ke admin/admin123.', 'system');
  updateAuthStatus();
  notify('Akun default berhasil direset. Silakan login kembali.', 'success');
}
async function handleChangePassword(event){
  event.preventDefault();
  if(!isLoggedIn()){
    notify('Silakan login terlebih dahulu.', 'error');
    return;
  }
  const oldPassword=($('oldPassword').value||'').trim();
  const newPassword=($('newPassword').value||'').trim();
  const confirmPassword=($('confirmPassword').value||'').trim();
  const account=db.auth.accounts.find(x=>x.username===getSessionUser());
  if(!account){
    notify('Akun tidak valid.', 'error');
    return;
  }
  const oldHash=await hashPassword(oldPassword);
  if(account.passwordHash!==oldHash){
    notify('Password lama tidak cocok.', 'error');
    return;
  }
  if(!newPassword || newPassword.length < 4){
    notify('Password baru minimal 4 karakter.', 'error');
    return;
  }
  if(newPassword!==confirmPassword){
    notify('Konfirmasi password baru tidak cocok.', 'error');
    return;
  }
  account.passwordHash=await hashPassword(newPassword);
  db.auth.session=null;
  saveDB();
  logUserActivity('Ubah password', `Password akun ${account.username} berhasil diubah.`, account.username);
  $('oldPassword').value='';
  $('newPassword').value='';
  $('confirmPassword').value='';
  updateAuthStatus();
  notify('Password berhasil diganti. Silakan login kembali.', 'success');
}
function resetAllData(){
  if(!confirm('Reset semua data akan menghapus semua produk, transaksi, dan pengaturan. Lanjutkan?'))return;
  db=createFreshDB();
  saveDB();
  loadSettings();
  renderProducts();
  renderSelect();
  renderCustomerSuggestions();
  renderCustomerDirectory();
  renderUserActivity();
  renderCart();
  renderTransactions();
  renderReport();
  clearSale();
  updateAuthStatus();
  logUserActivity('Reset data', 'Semua data aplikasi direset ke kondisi awal.', getSessionUser() || 'system');
  notify('Data berhasil direset ke kondisi baru.', 'success');
}
function updateConnectionStatus(){
  const statusText=$('connectionStatusText');
  const connected=navigator.onLine;
  if(statusText) statusText.textContent=connected?'online':'offline';
  if(statusText) statusText.style.color=connected?'#16a34a':'#dc2626';
}
function handleQuickEnter(event){
  if(event.key!=='Enter')return;
  const activeId=event.target?.id;
  if(['productSearch','qty'].includes(activeId)){
    event.preventDefault();
    addItem();
    return;
  }
  if(['pCode','pName','pBuyPrice','pSellPrice','pStock'].includes(activeId)){
    event.preventDefault();
    saveProduct();
  }
}
function showPage(page){document.querySelectorAll('.page').forEach(x=>x.classList.add('hidden'));$(page).classList.remove('hidden');document.querySelectorAll('.nav').forEach(x=>x.classList.toggle('active',x.dataset.page===page));$('pageTitle').textContent=document.querySelector(`[data-page="${page}"]`).textContent.replace(/^.\s*/,'')}
function updateClock(){$('clock').textContent=new Date().toLocaleString('id-ID',{dateStyle:'full',timeStyle:'medium'})}
function renderSelect(){
  $('productSelect').innerHTML=db.products.map(p=>`<option value="${p.id}">${esc(p.code)} - ${esc(p.name)} | Sisa stok ${p.sisaStok}</option>`).join('');
  $('productOptions').innerHTML=db.products.map(p=>`<option value="${esc(p.code)} - ${esc(p.name)}"></option>`).join('');
}
function findProductBySearch(search=''){
  const value=(search||'').trim().toLowerCase();
  if(!value) return null;
  const [codePart, namePart]=value.split(' - ');
  const exactByCode=db.products.find(x=>x.code.toLowerCase()===value || x.code.toLowerCase()===codePart);
  if(exactByCode) return exactByCode;
  const exactByName=db.products.find(x=>x.name.toLowerCase()===value || x.name.toLowerCase()===namePart);
  if(exactByName) return exactByName;
  return db.products.find(x=>x.code.toLowerCase().includes(value) || x.name.toLowerCase().includes(value)) || null;
}
function renderCustomerSuggestions(){
  const names=[...new Set((db.sales||[]).map(s=>s.customer).filter(Boolean))];
  $('customerList').innerHTML=names.map(name=>`<option value="${esc(name)}"></option>`).join('');
}
function addItem(){
  const search=($('productSearch').value||'').trim();
  let p=findProductBySearch(search);
  if(!p){
    p=db.products.find(x=>x.id===$('productSelect').value);
  }
  let q=Math.max(1,parseInt($('qty').value)||1);
  if(!p)return alert('Pilih produk yang tersedia terlebih dahulu.');
  if(q>Number(p.sisaStok||0)){
    return alert(`Stok ${p.name} tidak mencukupi. Sisa stok: ${p.sisaStok}`);
  }
  cart.push({...p, qty:q, price:p.sellPrice, lineId:Date.now()+Math.random()});
  $('qty').value=1;
  $('productSearch').value='';
  renderCart();
}
function renderCart(){
  $('cartBody').innerHTML=cart.length?cart.map((x,i)=>{
    const product=db.products.find(p=>p.id===x.id);
    const currentName=product?.name || x.name;
    const currentPrice=Number(product?.sellPrice ?? x.price ?? 0);
    const lineTotal=currentPrice*x.qty;
    return `<tr><td>${esc(currentName)}</td><td>${money(currentPrice)}</td><td>${x.qty}</td><td>${money(lineTotal)}</td><td><button class="remove" onclick="removeCart(${i})">×</button></td></tr>`;
  }).join(''):`<tr><td colspan="5" style="text-align:center;color:#999">Belum ada item</td></tr>`;
  let sub=cart.reduce((a,x)=>{
    const product=db.products.find(p=>p.id===x.id);
    const currentPrice=Number(product?.sellPrice ?? x.price ?? 0);
    return a + currentPrice*x.qty;
  },0),disc=Math.max(0,Number($('discount').value)||0),total=Math.max(0,sub-disc),downPayment=Math.min(total,Math.max(0,Number($('downPayment').value)||0)),paid=Math.max(0,Number($('paid').value)||0),dueNow=Math.max(0,total-downPayment),remaining=Math.max(0,total-downPayment-paid);
  $('subtotal').textContent=money(sub);$('grandTotal').textContent=money(total);$('remainingBalance').textContent=money(remaining);$('change').textContent=money(Math.max(0,paid-dueNow));
}
function removeCart(i){cart.splice(i,1);renderCart()}
function clearSale(){
  cart=[];
  $('customer').value='';
  $('phone').value='';
  $('productSearch').value='';
  $('notes').value='';
  $('discount').value=0;
  $('downPayment').value=0;
  $('paid').value=0;
  $('orderStatus').value='Baru';
  $('payment').value='Cash';
  $('qty').value=1;
  $('orderNo').value=orderNumber();
  updateOrderDateTime();
  renderCart();
}
function saveSale(){
  if(!cart.length)return alert('Tambahkan minimal satu item.');
  for(const item of cart){
    const product=db.products.find(x=>x.id===item.id);
    if(!product) return alert('Produk tidak ditemukan.');
    if((Number(product.sisaStok)||0) < item.qty) return alert(`Stok ${product.name} tidak mencukupi untuk transaksi ini.`);
  }
  let sub=cart.reduce((a,x)=>{
    const product=db.products.find(p=>p.id===x.id);
    const currentPrice=Number(product?.sellPrice ?? x.price ?? 0);
    return a + currentPrice*x.qty;
  },0),disc=Number($('discount').value)||0,total=Math.max(0,sub-disc),downPayment=Math.min(total,Math.max(0,Number($('downPayment').value)||0)),paid=Math.max(0,Number($('paid').value)||0),remaining=Math.max(0,total-downPayment-paid);
  const saleNo=$('orderNo').value;
  let sale={id:Date.now(),no:saleNo,date:$('orderDate').value,customer:$('customer').value||'Umum',phone:$('phone').value,notes:$('notes').value,items:cart.map(x=>{
    const product=db.products.find(p=>p.id===x.id);
    return {id:x.id,code:product?.code || x.code,name:product?.name || x.name,price:Number(product?.sellPrice ?? x.price ?? 0),qty:x.qty};
  }),subtotal:sub,discount:disc,total,downPayment,paid,remaining,payment:$('payment').value,status:$('orderStatus').value||'Baru',barcodeText:buildReceiptBarcodeText({no:saleNo,customer:$('customer').value||'Umum',total, date:$('orderDate').value})};
  cart.forEach(item=>{
    const product=db.products.find(x=>x.id===item.id);
    if(product){ product.sisaStok=Math.max(0, Number(product.sisaStok||0)-item.qty); }
  });
  const saleCustomerName=(sale.customer||'Umum').trim() || 'Umum';
  const existingCustomer=db.customers.find(customer=>customer.name.toLowerCase()===saleCustomerName.toLowerCase() && (customer.phone||'')===String(sale.phone||''));
  if(existingCustomer){
    existingCustomer.totalTransactions = (Number(existingCustomer.totalTransactions)||0) + 1;
    existingCustomer.totalSpending = Number(existingCustomer.totalSpending || 0) + Number(sale.total || 0);
    existingCustomer.lastVisit = sale.date || existingCustomer.lastVisit;
  } else {
    db.customers.unshift({
      id: Date.now() + Math.random(),
      name: saleCustomerName,
      phone: String(sale.phone || '').trim(),
      orderNo: saleNo,
      company:'',
      notes:'',
      totalTransactions:1,
      totalSpending:Number(sale.total || 0),
      lastVisit:sale.date || new Date().toISOString()
    });
  }
  db.sales.unshift(sale);saveDB();renderCustomerSuggestions();renderCustomerDirectory();logUserActivity('Transaksi baru', `Transaksi ${sale.no} untuk ${saleCustomerName} berhasil disimpan.`, getSessionUser() || 'system');printReceipt(sale);renderTransactions();renderReport();renderProducts();renderSelect();clearSale();
}
function renderProducts(){
  const q=($('searchProduct')?.value||'').trim().toLowerCase();
  const rows = (q ? db.products.filter(p => (
    String(p.code || '').toLowerCase().includes(q) ||
    String(p.name || '').toLowerCase().includes(q)
  )) : db.products);

  $('productBody').innerHTML = rows.map(p => `<tr><td><input type="checkbox" ${selectedProductIds.has(p.id)?'checked':''} onchange="toggleProductSelection(${p.id}, this.checked)"></td><td>${esc(p.code)}</td><td>${esc(p.name)}</td><td>${money(p.buyPrice)}</td><td>${money(p.sellPrice)}</td><td>${p.stockAwal}</td><td>${p.sisaStok}</td><td><button class="btn mini" onclick="openProduct(${p.id})">Edit</button> <button class="btn mini danger" onclick="deleteProduct(${p.id})">Hapus</button></td></tr>`).join('') || `<tr><td colspan="8" style="text-align:center;color:#999">${q ? 'Barang tidak ditemukan.' : 'Belum ada barang.'}</td></tr>`;
  updateProductBulkButtons();
}
function openProduct(id){editProductId=id||null;$('modalTitle').textContent=id?'Edit Barang':'Tambah Barang';let p=db.products.find(x=>x.id===id);$('pCode').value=p?.code||'';$('pName').value=p?.name||'';$('pBuyPrice').value=p?.buyPrice||'';$('pSellPrice').value=p?.sellPrice||'';$('pStock').value=p?.stockAwal||'';$('modal').classList.remove('hidden')}
function closeModal(){$('modal').classList.add('hidden')}
function saveProduct(){let code=$('pCode').value.trim().toUpperCase(),name=$('pName').value.trim(),buyPrice=Number($('pBuyPrice').value),sellPrice=Number($('pSellPrice').value),stockAwal=Number($('pStock').value);if(!code||!name||!buyPrice||!sellPrice||!Number.isFinite(stockAwal))return alert('Kode barang, nama barang, harga beli, harga jual, dan stok awal wajib diisi.');if(editProductId){let p=db.products.find(x=>x.id===editProductId);Object.assign(p,{code,name,buyPrice,sellPrice,stockAwal,sisaStok:Math.max(0,stockAwal)}); cart.forEach(item=>{if(item.id===editProductId){item.code=code;item.name=name;item.price=sellPrice;}})}else db.products.push({id:Date.now(),code,name,buyPrice,sellPrice,stockAwal,sisaStok:stockAwal});saveDB();closeModal();renderProducts();renderSelect();renderCart()}
function deleteProduct(id){if(confirm('Hapus barang ini?')){db.products=db.products.filter(x=>x.id!==id);selectedProductIds.delete(id);saveDB();renderProducts();renderSelect();renderReport();}}
function deleteTransaction(id){if(confirm('Hapus transaksi ini?')){db.sales=db.sales.filter(x=>x.id!==id);saveDB();renderCustomerSuggestions();renderTransactions();renderReport()}}
function updateOrderStatus(id,value){const sale=db.sales.find(x=>x.id===id); if(sale){sale.status=value; saveDB(); renderTransactions(); renderReport();}}
function renderTransactionSummary(){
  const totalCount=db.sales.length;
  const totalSales=db.sales.reduce((sum,s)=>sum+Number(s.total||0),0);
  const unpaidAmount=db.sales.filter(s=>(Number(s.remaining)||0)>0).reduce((sum,s)=>sum+Number(s.remaining||0),0);
  const completedCount=db.sales.filter(s=>(s.status||'Baru')==='Selesai').length;
  $('totalTransactionsMetric').textContent=totalCount;
  $('salesMetric').textContent=money(totalSales);
  $('unpaidMetric').textContent=money(unpaidAmount);
  $('completedMetric').textContent=completedCount;
}

function renderTransactionFilters(){
  const filters=['Semua','Belum Lunas','Lunas','Baru','Diproses','Selesai','Ditunda'];
  $('transactionFilters').innerHTML=filters.map(filter=>`<button class="transaction-filter ${currentTransactionFilter===filter?'active':''}" data-filter="${filter}">${filter}</button>`).join('');
}

function matchesTransactionFilter(sale){
  const status=sale.status||'Baru';
  const remaining=Number(sale.remaining||0);
  switch(currentTransactionFilter){
    case 'Belum Lunas': return remaining>0;
    case 'Lunas': return remaining<=0;
    case 'Baru': return status==='Baru';
    case 'Diproses': return status==='Diproses';
    case 'Selesai': return status==='Selesai';
    case 'Ditunda': return status==='Ditunda';
    default: return true;
  }
}

let currentEditTransactionId=null;
function closeTransactionEditModal(){
  currentEditTransactionId=null;
  const modal=$('transactionEditModal');
  if(modal) modal.classList.add('hidden');
}
function editTransaction(id){
  const sale=db.sales.find(x=>x.id===id); if(!sale) return;
  currentEditTransactionId=id;
  $('editTransactionNo').value=sale.no||'';
  $('editTransactionCustomer').value=sale.customer||'';
  $('editTransactionTotal').value=Number(sale.total||0);
  $('editTransactionPaid').value=Number(sale.paid||0);
  $('editTransactionRemaining').value=Number(sale.remaining||0);
  $('editTransactionStatus').value=sale.status||'Baru';
  $('transactionEditModal').classList.remove('hidden');
}
function saveTransactionEdit(){
  const sale=db.sales.find(x=>x.id===currentEditTransactionId); if(!sale) return;
  sale.customer=($('editTransactionCustomer').value||'').trim() || 'Umum';
  sale.total=Math.max(0, Number($('editTransactionTotal').value)||0);
  sale.paid=Math.max(0, Number($('editTransactionPaid').value)||0);
  sale.remaining=Math.max(0, Number($('editTransactionRemaining').value)||0);
  sale.status=$('editTransactionStatus').value||'Baru';
  sale.barcodeText=buildReceiptBarcodeText({no:sale.no,customer:sale.customer,total:sale.total,date:sale.date});
  saveDB();
  closeTransactionEditModal();
  renderTransactions();
  renderReport();
  renderCustomerSuggestions();
  notify('Transaksi berhasil diperbarui.', 'success');
}

function renderTransactions(){
  renderTransactionSummary();
  renderTransactionFilters();
  let q=($('searchTransaction').value||'').toLowerCase();
  let rows=db.sales.filter(s=>{
    const haystack=(s.no+' '+s.customer+' '+(s.phone||'')).toLowerCase();
    return haystack.includes(q) && matchesTransactionFilter(s);
  });
  $('transactionBody').innerHTML=rows.map(s=>`<tr><td>${esc(s.no)}</td><td>${new Date(s.date).toLocaleString('id-ID')}</td><td>${esc(s.customer)}</td><td>${money(s.total)}</td><td>${money(Number(s.paid||0))}</td><td>${money(Number(s.remaining||0))}</td><td><select onchange="updateOrderStatus(${s.id}, this.value)"><option value="Baru" ${((s.status||'Baru')==='Baru')?'selected':''}>Baru</option><option value="Diproses" ${((s.status||'Baru')==='Diproses')?'selected':''}>Diproses</option><option value="Selesai" ${((s.status||'Baru')==='Selesai')?'selected':''}>Selesai</option><option value="Ditunda" ${((s.status||'Baru')==='Ditunda')?'selected':''}>Ditunda</option></select></td><td><button class="btn mini" onclick="editTransaction(${s.id})">Edit</button> <button class="btn mini danger" onclick="deleteTransaction(${s.id})">Hapus</button> <button class="btn mini" onclick='printReceipt(${JSON.stringify(s).replaceAll("'","&#39;")})'>Print</button></td></tr>`).join('')||`<tr><td colspan="8" style="text-align:center;">Belum ada transaksi.</td></tr>`;
}
function buildSalesChart(range='7'){
  const canvas=$('salesChart');
  if(!canvas) return;
  const ctx=canvas.getContext('2d');
  const labels=[];
  const values=[];
  const now=new Date();
  const days=range==='month'?30:range==='7'?7:30;
  for(let i=days-1;i>=0;i--){
    const d=new Date(now);
    d.setDate(d.getDate()-i);
    labels.push(d.toLocaleDateString('id-ID',{day:'numeric',month:'short'}));
    const dateKey=d.toISOString().slice(0,10);
    const total=db.sales.filter(s=>s.date&&s.date.slice(0,10)===dateKey).reduce((sum,s)=>sum+Number(s.total||0),0);
    values.push(total);
  }
  const max=Math.max(...values,1);
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const padding={top:18,right:12,bottom:26,left:32};
  const width=canvas.width-padding.left-padding.right;
  const height=canvas.height-padding.top-padding.bottom;
  const barWidth=Math.max(16, width/Math.max(values.length,1)-10);
  ctx.strokeStyle='#e5e7eb';
  ctx.lineWidth=1;
  for(let i=0;i<=4;i++){
    const y=padding.top + (height/4)*i;
    ctx.beginPath(); ctx.moveTo(padding.left,y); ctx.lineTo(canvas.width-padding.right,y); ctx.stroke();
  }
  ctx.fillStyle='#6b7280'; ctx.font='12px Arial';
  labels.forEach((label,index)=>{
    const x=padding.left + (index*(width/labels.length)) + ((width/labels.length)-barWidth)/2;
    const value=values[index];
    const barHeight=(value/max)*height;
    const y=canvas.height-padding.bottom-barHeight;
    ctx.fillStyle='#60a5fa';
    ctx.fillRect(x,y,barWidth,barHeight);
    ctx.fillStyle='#6b7280';
    ctx.fillText(label,x+2,y+barHeight+14);
  });
}

function renderReport(){
  let t=today(),m=t.slice(0,7),td=db.sales.filter(s=>s.date&&s.date.slice(0,10)===t),ms=db.sales.filter(s=>s.date&&s.date.slice(0,7)===m);
  const todayTotal=td.reduce((a,s)=>a+Number(s.total||0),0);
  const cashIn=td.reduce((a,s)=>a+Number(s.paid||0),0);
  const unpaid=db.sales.filter(s=>(Number(s.remaining)||0)>0).reduce((sum,s)=>sum+Number(s.remaining||0),0);
  const processing=db.sales.filter(s=>(s.status||'Baru')==='Diproses').length;
  const completed=db.sales.filter(s=>(s.status||'Baru')==='Selesai').length;
  if($('todaySales')) $('todaySales').textContent=money(todayTotal);
  if($('todayCount')) $('todayCount').textContent=td.length;
  if($('cashInToday')) $('cashInToday').textContent=money(cashIn);
  if($('unpaidToday')) $('unpaidToday').textContent=money(unpaid);
  if($('processingCount')) $('processingCount').textContent=processing;
  if($('completedCount')) $('completedCount').textContent=completed;
  if($('monthSales')) $('monthSales').textContent=money(ms.reduce((a,s)=>a+Number(s.total||0),0));
  const lowProducts=db.products.filter(p=>Number(p.sisaStok||0)<=15).slice(0,3);
  const processingOrders=db.sales.filter(s=>(s.status||'Baru')==='Diproses'||(s.status||'Baru')==='Baru').slice(0,3);
  const recentSales=db.sales.slice(0,2);
  $('reportContent').innerHTML=`
    <div class="dashboard-panels">
      <div class="dashboard-panel">
        <h3>Pesanan Perlu Dikerjakan</h3>
        <div class="dashboard-list">
          ${processingOrders.length ? processingOrders.map(s=>`<div class="order-row"><div class="order-meta"><strong>${esc(s.no)}</strong><span>${esc(s.customer || 'Umum')}</span></div><span class="badge ${(s.status||'Baru').toLowerCase()==='diproses'?'diproses':'baru'}">${esc(s.status||'Baru')}</span></div>`).join('') : '<div class="order-row"><div class="order-meta"><strong>Tidak ada pesanan</strong></div></div>'}
        </div>
        <div style="margin-top:12px;text-align:right;"><button class="btn ghost" onclick="showPage('transaksi')">Lihat Semua</button></div>
      </div>
      <div class="dashboard-panel">
        <h3>Stok Menipis</h3>
        <div class="dashboard-list">
          ${lowProducts.length ? lowProducts.map(p=>`<div class="stock-row"><div class="stock-meta"><strong>${esc(p.name)}</strong><small>${esc(p.code)}</small></div><span><b>${p.sisaStok}</b></span></div>`).join('') : '<div class="stock-row"><div class="stock-meta"><strong>Semua stok aman</strong></div></div>'}
        </div>
        <div style="margin-top:12px;text-align:right;"><button class="btn ghost" onclick="showPage('produk')">Lihat Semua</button></div>
      </div>
      <div class="dashboard-panel" style="grid-column:1 / -1;">
        <h3>Transaksi Terbaru</h3>
        <div class="dashboard-list">
          ${recentSales.length ? recentSales.map(s=>`<div class="txn-row"><div class="txn-meta"><strong>${esc(s.no)}</strong><span>${esc(s.customer || 'Umum')}</span><small>${s.status==='Selesai' ? 'Selesai • '+(Number(s.remaining||0)===0 ? 'Lunas' : `DP Rp${Number(s.downPayment||0).toLocaleString('id-ID')}`) : `${esc(s.status||'Baru')} • ${money(Number(s.remaining||0))}`}</small></div><span><b>${money(s.total)}</b></span></div>`).join('') : '<div class="txn-row"><div class="txn-meta"><strong>Belum ada transaksi</strong></div></div>'}
        </div>
        <div style="margin-top:12px;text-align:right;"><button class="btn ghost" onclick="showPage('transaksi')">Riwayat</button></div>
      </div>
    </div>`;
  buildSalesChart('7');
}

function initDashboardChartControls(){
  document.querySelectorAll('.chart-tab').forEach(button=>{
    button.onclick=()=>{
      document.querySelectorAll('.chart-tab').forEach(btn=>btn.classList.toggle('active',btn===button));
      buildSalesChart(button.dataset.range || '7');
    };
  });
}
function printReport(){
  const reportSection=document.getElementById('laporan');
  const clone=reportSection.cloneNode(true);
  clone.classList.remove('hidden');
  clone.querySelectorAll('.btn').forEach(el=>el.remove());
  const printWindow=window.open('','_blank','width=900,height=800');
  if(!printWindow)return alert('Izinkan pop-up untuk mencetak laporan.');
  printWindow.document.write(`<!doctype html><html><head><meta charset="UTF-8"><title>Laporan Penjualan</title><style>body{margin:0;padding:24px;font-family:Arial,sans-serif;color:#111;background:#fff} .print-shell{max-width:900px;margin:0 auto} .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:16px}.stat{border:1px solid #e5e7eb;padding:12px;border-radius:8px;background:#fafafa}.card{border:1px solid #e5e7eb;padding:16px;border-radius:10px;background:#fff} table{width:100%;border-collapse:collapse;font-size:13px} th,td{border-bottom:1px solid #e5e7eb;padding:8px;text-align:left} h2{margin:0 0 12px;font-size:18px} @media print{body{padding:0} .print-shell{max-width:none}}</style></head><body><div class="print-shell">${clone.outerHTML}</div></body></html>`);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(()=>printWindow.print(),300);
}
function applyBrandLogos(){
  const profileLogo=db.settings.profileLogo||'wafilogo.png';
  const invoiceLogo=db.settings.invoiceLogo||'logo_kasir.png';
  const profilePreview=$('profileLogoPreview');
  if(profilePreview) profilePreview.src=profileLogo;
  if(!db.settings.profileLogo) db.settings.profileLogo=profileLogo;
  if(!db.settings.invoiceLogo) db.settings.invoiceLogo=invoiceLogo;
}

function applyLoginLogo(){
  const loginLogo = db.settings.loginLogoImage || 'wafilogo.png';
  const logoImg = document.querySelector('.auth-side-logo');
  if(logoImg) logoImg.src = loginLogo;
  if(!db.settings.loginLogoImage) db.settings.loginLogoImage = loginLogo;
}

function applyLoginTheme(){
  const accent = (db.settings.loginAccentColor || '#1db9db').trim();
  const root = document.documentElement;
  root.style.setProperty('--login-accent', accent);
  root.style.setProperty('--login-accent-dark', shadeColor(accent, -18));
  if($('loginAccentColor')) $('loginAccentColor').value = accent;
}

function loadSettings(){
  if($('shopName')) $('shopName').value=db.settings.name;
  if($('shopAddress')) $('shopAddress').value=db.settings.address;
  if($('shopPhone')) $('shopPhone').value=db.settings.phone;
  if($('shopEmail')) $('shopEmail').value=db.settings.email || '';
  if($('receiptFooter')) $('receiptFooter').value=db.settings.footer;
  if($('showReceiptBarcode')) $('showReceiptBarcode').checked=Boolean(db.settings.receiptShowBarcode!==false);
  if($('showOrderNoBelowBarcode')) $('showOrderNoBelowBarcode').checked=Boolean(db.settings.receiptShowOrderNoBelowBarcode!==false);
  if($('loginBackgroundOverlay')) $('loginBackgroundOverlay').value=String(Math.max(0, Math.min(100, Number(db.settings.loginBackgroundOverlay ?? 60))));
  if($('loginBackgroundBlur')) $('loginBackgroundBlur').value=String(Math.max(0, Math.min(20, Number(db.settings.loginBackgroundBlur ?? 0))));
  if($('loginBackgroundBrightness')) $('loginBackgroundBrightness').value=String(Math.max(0.6, Math.min(1.4, Number(db.settings.loginBackgroundBrightness ?? 1))));
  if($('loginAccentColor')) $('loginAccentColor').value = db.settings.loginAccentColor || '#1db9db';
  applyBrandLogos();
  applyLoginTheme();
  applyLoginLogo();
  applyLoginBackground();
}
async function saveSettings(){
  const profileFile=$('profileLogoInput')?.files?.[0];
  const invoiceFile=$('invoiceLogoInput')?.files?.[0];
  const loginBackgroundFile=$('loginBackgroundImageInput')?.files?.[0];
  const loginLogoFile=$('loginLogoImageInput')?.files?.[0];
  const nextSettings={
    ...db.settings,
    name:$('shopName')?.value || db.settings.name,
    address:$('shopAddress')?.value || db.settings.address,
    phone:$('shopPhone')?.value || db.settings.phone,
    email:$('shopEmail')?.value || '',
    footer:$('receiptFooter')?.value || db.settings.footer,
    receiptShowBarcode:$('showReceiptBarcode')?.checked ?? true,
    receiptShowOrderNoBelowBarcode:$('showOrderNoBelowBarcode')?.checked ?? true,
    loginBackgroundOverlay:Number($('loginBackgroundOverlay')?.value || 60),
    loginBackgroundBlur:Number($('loginBackgroundBlur')?.value || 0),
    loginBackgroundBrightness:Number($('loginBackgroundBrightness')?.value || 1),
    loginAccentColor:$('loginAccentColor')?.value || db.settings.loginAccentColor || '#1db9db'
  };
  if(profileFile) nextSettings.profileLogo=await readFileAsDataUrl(profileFile);
  if(invoiceFile) nextSettings.invoiceLogo=await readFileAsDataUrl(invoiceFile);
  if(loginBackgroundFile) nextSettings.loginBackgroundImage=await readFileAsDataUrl(loginBackgroundFile);
  if(loginLogoFile) nextSettings.loginLogoImage=await readFileAsDataUrl(loginLogoFile);
  db.settings=nextSettings;
  saveDB();
  logUserActivity('Simpan pengaturan', 'Pengaturan toko berhasil diperbarui.', getSessionUser() || 'system');
  applyBrandLogos();
  applyLoginTheme();
  applyLoginLogo();
  applyLoginBackground();
  notify('Pengaturan tersimpan.', 'success');
}

function applyLoginBackground(){
  const overlay=$('authOverlay');
  if(!overlay) return;
  const loginBackgroundImage=db.settings.loginBackgroundImage || '';
  const overlayAlpha=Math.max(0, Math.min(1, (Number(db.settings.loginBackgroundOverlay ?? 60) || 60) / 100));
  const blurValue=Math.max(0, Number(db.settings.loginBackgroundBlur ?? 0) || 0);
  const brightnessValue=Math.max(0.6, Math.min(1.4, Number(db.settings.loginBackgroundBrightness ?? 1) || 1));
  const fallbackBackground='linear-gradient(135deg, rgba(15,23,42,0.72), rgba(30,41,59,0.86))';
  const imageCss = loginBackgroundImage ? `url("${String(loginBackgroundImage).replace(/"/g,'\\"')}")` : fallbackBackground;
  const finalBackground = imageCss === fallbackBackground ? fallbackBackground : imageCss;
  overlay.style.setProperty('--login-bg-image', finalBackground);
  overlay.style.setProperty('--login-bg-overlay', String(overlayAlpha));
  overlay.style.setProperty('--login-bg-blur', `${blurValue}px`);
  overlay.style.setProperty('--login-bg-brightness', String(brightnessValue));
  overlay.style.backgroundImage = finalBackground;
  overlay.style.backgroundSize = 'cover';
  overlay.style.backgroundPosition = 'center';
  overlay.style.backgroundRepeat = 'no-repeat';
}

async function saveLoginAppearance(){
  return saveSettings();
}

function resetLoginAppearance(){
  db.settings.loginBackgroundImage='';
  db.settings.loginLogoImage='wafilogo.png';
  db.settings.loginBackgroundOverlay=60;
  db.settings.loginBackgroundBlur=0;
  db.settings.loginBackgroundBrightness=1;
  db.settings.loginAccentColor='#1db9db';
  if($('loginBackgroundOverlay')) $('loginBackgroundOverlay').value='60';
  if($('loginBackgroundBlur')) $('loginBackgroundBlur').value='0';
  if($('loginBackgroundBrightness')) $('loginBackgroundBrightness').value='1';
  if($('loginBackgroundImageInput')) $('loginBackgroundImageInput').value='';
  if($('loginLogoImageInput')) $('loginLogoImageInput').value='';
  if($('loginAccentColor')) $('loginAccentColor').value='#1db9db';
  saveDB();
  applyLoginTheme();
  applyLoginLogo();
  applyLoginBackground();
  notify('Tampilan login direset ke default.', 'success');
}
function backup(){
  if(typeof XLSX === 'undefined'){
    const todayDate=today();
    const monthDate=todayDate.slice(0,7);
    const payload={
      exportedAt:new Date().toISOString(),
      settings:db.settings||{},
      products:(db.products||[]),
      report:{
        date:todayDate,
        month:monthDate,
        sales:(db.sales||[])
      }
    };
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download='backup-data-'+today()+'.json';
    a.click();
    URL.revokeObjectURL(a.href);
    return;
  }

  const rows=(db.sales||[]).map(s=>{
    const itemsText=Array.isArray(s.items)&&s.items.length
      ? s.items.map(item=>`${item.name || ''} (${Number(item.qty||0)} x ${Number(item.price||0)})`).join('; ')
      : '';
    return {
      'No Pesanan': s.no || '',
      'Tanggal': s.date ? new Date(s.date).toLocaleString('id-ID') : '',
      'Pelanggan': s.customer || '',
      'HP': s.phone || '',
      'Status': s.status || 'Baru',
      'Pembayaran': s.payment || '',
      'Subtotal': Number(s.subtotal || 0),
      'Diskon': Number(s.discount || 0),
      'Total': Number(s.total || 0),
      'DP': Number(s.downPayment || 0),
      'Dibayar': Number(s.paid || 0),
      'Sisa': Number(s.remaining || 0),
      'Catatan': s.notes || '',
      'Produk': itemsText,
      'Barcode': s.barcodeText || ''
    };
  });

  const productRows=(db.products||[]).map(p=>({
    'Kode Barang': p.code || '',
    'Nama Barang': p.name || '',
    'Harga Beli': Number(p.buyPrice || 0),
    'Harga Jual': Number(p.sellPrice || 0),
    'Stok Awal': Number(p.stockAwal || 0),
    'Sisa Stok': Number(p.sisaStok || 0)
  }));

  const settingsRows=Object.entries(db.settings||{}).map(([key,value])=>({
    'Nama Pengaturan': key,
    'Nilai': typeof value === 'object' ? JSON.stringify(value) : String(value ?? '')
  }));

  const workbook=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Semua Transaksi');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(productRows), 'Produk');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(settingsRows), 'Pengaturan');
  XLSX.writeFile(workbook, `backup-transaksi-${today()}.xlsx`);
  notify('Backup data berhasil disimpan dalam format Excel.', 'success');
}
function formatReceiptDate(dateValue){
  const d=new Date(dateValue);
  const pad=n=>String(n).padStart(2,'0');
  return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${String(d.getFullYear()).slice(-2)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function buildReceiptBarcodeText(s={}){
const normalizeBarcodePart=(value='')=>String(value ?? '').replace(/\|/g,' ').replace(/\s+/g,' ').trim();
const orderNo=normalizeBarcodePart(s.no);
const customer=normalizeBarcodePart(s.customer);
const total=Number(s.total||0);
const dateValue=s.date ? new Date(s.date) : new Date();
const formattedDate=`${pad(dateValue.getDate())}/${pad(dateValue.getMonth()+1)}/${dateValue.getFullYear()}`;
return `${orderNo}|${customer}|${Math.round(total)}|${formattedDate}`;
function pad(n){ return String(n).padStart(2,'0'); }
}
function getInvoiceLogoUrl(){const invoiceLogo=db.settings.invoiceLogo||'logo_kasir.png'; return invoiceLogo.startsWith('data:') ? invoiceLogo : new URL(invoiceLogo, window.location.href).toString();}
function printReceipt(s){
  let w=window.open('','_blank','width=360,height=760');if(!w)return alert('Izinkan pop-up untuk mencetak nota.');
  const logoUrl=getInvoiceLogoUrl();
  const receiptBarcodeEnabled=db.settings.receiptShowBarcode!==false;
  const receiptOrderNoBelowBarcode=db.settings.receiptShowOrderNoBelowBarcode!==false;
  const barcodeText=s.barcodeText || buildReceiptBarcodeText(s);
  const barcodeSection=receiptBarcodeEnabled ? `
    <div class="receipt-barcode-note"></div>
    <div class="barcode-wrap">
      <svg id="receiptBarcode" aria-label="Barcode transaksi"></svg>
      <div id="receiptBarcodeFallback" class="receipt-barcode-fallback">${esc(barcodeText)}</div>
    </div>
    ${receiptOrderNoBelowBarcode ? `<div class="receipt-orderno">${esc(s.no||barcodeText.split('|')[0])}</div>` : ''}
  ` : '';
  const hpLine=s.phone?`<p class="detail-row"><span class="detail-label">HP</span><span class="colon">:</span><span class="detail-value">${esc(s.phone)}</span></p>`:'';
  w.document.write(`<html><head><title>${s.no}</title><style>body{margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif} .receipt{width:75mm;max-width:100%;margin:0 auto;padding:10px;box-sizing:border-box;background:#fff;color:#111;word-break:break-word} .header{display:flex;flex-direction:column;align-items:center;justify-content:center;margin:2px 0 4px;text-align:center} .logo{width:40px;height:40px;object-fit:contain;margin-bottom:3px} .company{font-size:14px;font-weight:bold;margin:0} .info,.detail,.item,.summary,.footer{font-size:12px;line-height:1.2} p{margin:2px 0} .detail-row{display:flex;align-items:flex-start;gap:4px} .detail-label{display:inline-block;min-width:52px} .colon{display:inline-block;width:8px;text-align:center} .detail-value{flex:1} .line{border-top:1px dashed #000;margin:6px 0}.r{display:flex;justify-content:space-between;gap:8px}.total{font-size:13px;font-weight:bold}.center{text-align:center}.item{margin:4px 0}.summary .r{margin:2px 0}.footer{font-size:11px;text-align:center}.barcode-wrap{display:flex;justify-content:center;align-items:center;width:100%;margin:2px auto 0;padding:0;position:relative}.barcode-wrap svg,.receipt-barcode-fallback{display:block;width:220px;max-width:100%;height:auto;background:#fff}.barcode-wrap svg{min-height:46px}.receipt-orderno{font-size:11px;text-align:center;margin-top:1px;letter-spacing:.2px;line-height:1.2}.receipt-barcode-note{border-top:1px dashed #000;margin:2px 0 1px}.receipt-barcode-fallback{display:none;white-space:normal;word-break:break-all;font-size:9px;text-align:center;padding:6px 4px;border:1px solid #ddd;border-radius:4px}.receipt-barcode-fallback.visible{display:block}@media print{body{background:#fff}.receipt{width:75mm;padding:0;box-shadow:none;border:0}@page{size:75mm auto;margin:3mm}}</style></head><body>
  <div class="receipt">
  <div class="header"><img class="logo" src="${logoUrl}" alt="Logo WAFI Printing"><div class="company">${esc(db.settings.name)}</div></div><p class="info center">${db.settings.phone?`HP/WA: ${esc(db.settings.phone)}<br>`:''}${db.settings.email?`Email: ${esc(db.settings.email)}<br>`:''}${esc(db.settings.address)}</p><div class="line"></div>
  <div class="detail"><p class="detail-row"><span class="detail-label">No</span><span class="colon">:</span><span class="detail-value">${esc(s.no)}</span></p><p class="detail-row"><span class="detail-label">Tgl</span><span class="colon">:</span><span class="detail-value">${formatReceiptDate(s.date)}</span></p><p class="detail-row"><span class="detail-label">Pelanggan</span><span class="colon">:</span><span class="detail-value">${esc(s.customer)}</span></p>${hpLine}</div><div class="line"></div>
  ${s.items.map(i=>`<div class="item"><div>${esc(i.name)}</div><div class="r"><span>${i.qty} x ${money(i.price)}</span><span>${money(i.qty*i.price)}</span></div></div>`).join('')}
  <div class="line"><div class="summary"><div class="r"><span>Subtotal</span><span>${money(s.subtotal)}</span></div><div class="r"><span>Diskon</span><span>${money(s.discount)}</span></div><div class="r total"><span>TOTAL</span><span>${money(s.total)}</span></div><div class="r"><span>DP / Uang Muka</span><span>${money(s.downPayment||0)}</span></div><div class="r"><span>Sisa Tagihan</span><span>${money(s.remaining||0)}</span></div><div class="r"><span>Kembali</span><span>${money(Math.max(0,(s.paid||0)-Math.max(0,(s.total-(s.downPayment||0)))))}</span></div></div></div>
  <div class="detail"><p>Metode: ${esc(s.payment)}</p><p>Status: ${esc(s.status||'Baru')}</p>${s.notes?`<p>Catatan: ${esc(s.notes)}</p>`:''}</div>${barcodeSection}<div class="line"><p class="footer">${esc(db.settings.footer)}</p></div>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
  <script>
    function renderReceiptBarcode(){
      const svg = document.getElementById('receiptBarcode');
      const fallback = document.getElementById('receiptBarcodeFallback');
      if (typeof JsBarcode === 'undefined' || !svg) {
        if (fallback) fallback.classList.add('visible');
        return;
      }
      JsBarcode('#receiptBarcode', ${JSON.stringify(barcodeText)}, {
        format: 'CODE128',
        width: 3.2,
        height: 62,
        displayValue: false,
        margin: 2,
        background: '#fff',
        lineColor: '#000',
        fontSize: 12,
        textMargin: 1
      });
      if (fallback) fallback.style.display = 'none';
    }
    window.addEventListener('load', function(){
      setTimeout(renderReceiptBarcode, 150);
      setTimeout(function(){
        const svg = document.getElementById('receiptBarcode');
        if (svg && svg.childNodes.length) {
          return;
        }
        if (document.getElementById('receiptBarcodeFallback')) {
          document.getElementById('receiptBarcodeFallback').classList.add('visible');
        }
      }, 800);
      setTimeout(function(){ window.print(); }, 1000);
    });
  <\/script></body></html>`);w.document.close()
}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
init();
