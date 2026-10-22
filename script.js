(() => {
  const TIMES = ['8:00 PM', '8:15 PM', '8:30 PM', '9:00 PM'];
  const STORAGE_KEY = 'pkBattleSchedulerBookings_v1';
  let bookings = loadBookings();
  let today = new Date(); today.setHours(0,0,0,0);
  let viewMonth = new Date(today.getFullYear(), today.getMonth()+1, 1);
  let selectedDates = [];
  const $ = id => document.getElementById(id);
  const pad = n => String(n).padStart(2, '0');
  const dateKey = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const parseDate = s => { const [y,m,d] = s.split('-').map(Number); return new Date(y,m-1,d); };
  const prettyDate = s => s ? parseDate(s).toLocaleDateString(undefined, {weekday:'long', month:'long', day:'numeric', year:'numeric'}) : 'Choose a date on the calendar';
  function loadBookings() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; } }
  function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings)); }
  function bookingsOn(date) { return bookings.filter(b => b.date === date); }
  function monthlyDatesForName(name, monthPrefix) {
    const normalized = name.trim().toLowerCase();
    if (!normalized) return [];
    return [...new Set(bookings.filter(b => b.name.trim().toLowerCase() === normalized && b.date.startsWith(monthPrefix)).map(b => b.date))];
  }
  function birthdayDate() { return $('birthday').value; }
  function isBirthday(date) { const b = birthdayDate(); return !!b && b.slice(5) === date.slice(5); }
  function canSelect(date) {
    const d = parseDate(date); d.setHours(0,0,0,0);
    if (d < today) return false;
    if (d.getDate() < 5 && !isBirthday(date)) return false;
    return bookingsOn(date).length < 3;
  }
  function renderCalendar() {
    $('monthLabel').textContent = viewMonth.toLocaleDateString(undefined, {month:'long', year:'numeric'});
    const grid = $('calendar'); grid.innerHTML = '';
    const firstDay = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1).getDay();
    const days = new Date(viewMonth.getFullYear(), viewMonth.getMonth()+1, 0).getDate();
    for (let i=0; i<firstDay; i++) { const blank = document.createElement('div'); grid.appendChild(blank); }
    for (let day=1; day<=days; day++) {
      const date = `${viewMonth.getFullYear()}-${pad(viewMonth.getMonth()+1)}-${pad(day)}`;
      const count = bookingsOn(date).length;
      const allowed = canSelect(date);
      const btn = document.createElement('button'); btn.type='button'; btn.className='day';
      if (selectedDates.includes(date)) btn.classList.add('selected');
      if (!allowed && !selectedDates.includes(date)) btn.classList.add('disabled');
      if (count >= 3) btn.classList.add('full');
      if (isBirthday(date)) btn.classList.add('birthday');
      btn.disabled = !allowed && !selectedDates.includes(date);
      btn.innerHTML = `<span class="number">${day}</span><span class="count">${count}/3 booked</span>`;
      btn.setAttribute('aria-label', `${prettyDate(date)}, ${count} of 3 bookings${allowed ? ', available' : ', unavailable'}`);
      btn.addEventListener('click', () => { if (selectedDates.includes(date)) selectedDates = selectedDates.filter(d => d !== date); else { if (selectedDates.length >= 3) return showNotice('You can select up to 3 dates per booking.', 'error'); selectedDates.push(date); } selectedDates.sort(); renderCalendar(); updateSelected(); updateTimes(); showNotice('', ''); });
      grid.appendChild(btn);
    }
  }
  function updateSelected() { $('selectedDate').textContent = selectedDates.length ? `${selectedDates.length} of 3 dates selected` : 'Choose up to 3 dates on the calendar'; }
  function updateTimes() {
    const host = $('dateTimeChoices'); const previous = Object.fromEntries([...host.querySelectorAll('select[data-date]')].map(s => [s.dataset.date,s.value])); host.innerHTML='';
    selectedDates.forEach(date => { const row=document.createElement('div'); row.className='date-time-row'; const label=document.createElement('div'); label.className='hint'; label.textContent=prettyDate(date); const select=document.createElement('select'); select.dataset.date=date; select.required=true; select.setAttribute('aria-label',`Battle time for ${prettyDate(date)}`); select.innerHTML='<option value="">Choose time</option>'; const used=bookingsOn(date).map(b=>b.time); TIMES.forEach(t=>{const opt=document.createElement('option');opt.value=t;opt.textContent=used.includes(t)?`${t} — booked`:t;opt.disabled=used.includes(t);select.appendChild(opt);}); if(previous[date]&&!used.includes(previous[date])) select.value=previous[date]; row.append(label,select); host.appendChild(row); });
    $('timeHint').textContent = !selectedDates.length ? 'Select dates on the calendar, then choose a time for each date.' : 'Each selected date needs its own available time.';
  }
  function updateMonthlyLimit() {
    const prefix = `${viewMonth.getFullYear()}-${pad(viewMonth.getMonth()+1)}`;
    const dates = monthlyDatesForName($('nameId').value, prefix);
    $('monthlyLimitHint').textContent = $('nameId').value.trim()
      ? `This name/ID has booked ${dates.length} of 3 dates this month.`
      : 'You may book up to 3 different dates per month using the same name or ID.';
  }
  function renderBookings() {
    const list = $('bookingList'); list.innerHTML='';
    const prefix = `${viewMonth.getFullYear()}-${pad(viewMonth.getMonth()+1)}`;
    const monthBookings = bookings.filter(b => b.date.startsWith(prefix)).sort((a,b) => a.date.localeCompare(b.date) || TIMES.indexOf(a.time)-TIMES.indexOf(b.time));
    $('bookingCount').textContent = `${monthBookings.length} booking${monthBookings.length===1?'':'s'}`;
    if (!monthBookings.length) { list.innerHTML='<div class="empty">No bookings for this month yet.</div>'; return; }
    monthBookings.forEach(b => {
      const key=b.name.trim().toLowerCase();
      if (list.querySelector(`[data-booking-key="${CSS.escape(key)}"]`)) return;
      const grouped=monthBookings.filter(x=>x.name.trim().toLowerCase()===key);
      const item=document.createElement('div'); item.className='booking-column'; item.dataset.bookingKey=key;
      const idCell=document.createElement('div'); idCell.className='booking-id'; idCell.textContent=b.name;
      const slots=document.createElement('div'); slots.className='booking-slots';
      grouped.sort((a,b)=>a.date.localeCompare(b.date)||TIMES.indexOf(a.time)-TIMES.indexOf(b.time)).forEach(x=>{const line=document.createElement('div');line.className='booking-slot';line.textContent=`${prettyDate(x.date)} · ${x.time}${x.isBirthday?' · 🎂 Birthday':''}${x.comment?' · '+x.comment:''}`;slots.appendChild(line);});
      const remove=document.createElement('button'); remove.className='secondary-btn'; remove.type='button'; remove.textContent='Remove all'; remove.setAttribute('aria-label',`Remove all bookings for ${b.name}`);
      remove.addEventListener('click',()=>{if(!confirm(`Remove all ${grouped.length} booking(s) for ${b.name}?`))return;const ids=new Set(grouped.map(x=>x.id));bookings=bookings.filter(x=>!ids.has(x.id));save();renderCalendar();renderBookings();updateTimes();updateMonthlyLimit();showNotice('Bookings removed.','success');});
      item.append(idCell,slots,remove); list.appendChild(item);
    });
  }
  function showNotice(message, type) { const n=$('notice'); n.textContent=message; n.className='notice'+(message?' show '+type:''); }
  $('bookingForm').addEventListener('submit', e => {
    e.preventDefault();
    const name = $('nameId').value.trim();
    if (!name) return showNotice('Please enter your name or ID.', 'error');
    if (!selectedDates.length) return showNotice('Please select at least one date on the calendar.', 'error');
    const monthPrefixes = [...new Set(selectedDates.map(d=>d.slice(0,7)))];
    if(monthPrefixes.length!==1) return showNotice('Please select all dates within the same month for one booking.', 'error');
    const existingDates=monthlyDatesForName(name,monthPrefixes[0]);
    if(new Set([...existingDates,...selectedDates]).size>3) return showNotice('This name/ID can book up to 3 different dates per month in total.', 'error');
    const choices=[...$('dateTimeChoices').querySelectorAll('select[data-date]')].map(s=>({date:s.dataset.date,time:s.value}));
    if(choices.length!==selectedDates.length || choices.some(x=>!TIMES.includes(x.time))) return showNotice('Please choose an available time for every selected date.', 'error');
    for(const choice of choices){if(!canSelect(choice.date)||bookingsOn(choice.date).length>=3)return showNotice(`${prettyDate(choice.date)} is no longer available. Please choose another date.`, 'error');if(bookingsOn(choice.date).some(b=>b.time===choice.time))return showNotice(`${choice.time} is already booked on ${prettyDate(choice.date)}.`, 'error');}
    const bd = birthdayDate();
    const comment=$('comment').value.trim();
    choices.forEach((choice,i)=>bookings.push({id:(crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random()+i)),name,date:choice.date,time:choice.time,birthday:bd,isBirthday:isBirthday(choice.date)&&bd.slice(5)===choice.date.slice(5),comment,createdAt:new Date().toISOString()}));
    save(); renderCalendar(); renderBookings(); updateTimes();
    showNotice(`One booking confirmed for ${choices.length} date(s) under ${name}.`, 'success');
    selectedDates=[]; $('comment').value=''; renderCalendar(); updateSelected(); updateTimes();
    updateMonthlyLimit();
  });
  $('nameId').addEventListener('input', () => { renderCalendar(); updateMonthlyLimit(); });
  $('birthday').addEventListener('change', () => { renderCalendar(); if (selectedDates.length) updateTimes(); });
  $('prevMonth').addEventListener('click', () => { viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth()-1, 1); selectedDates=[]; renderCalendar(); updateSelected(); updateTimes(); renderBookings(); updateMonthlyLimit(); showNotice('', ''); });
  $('nextMonth').addEventListener('click', () => { viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth()+1, 1); selectedDates=[]; renderCalendar(); updateSelected(); updateTimes(); renderBookings(); updateMonthlyLimit(); showNotice('', ''); });
  $('clearBtn').addEventListener('click', () => { if (!confirm('Clear all bookings saved in this browser? This cannot be undone.')) return; bookings=[]; save(); selectedDates=[]; renderCalendar(); updateSelected(); updateTimes(); renderBookings(); showNotice('Local demo bookings cleared.', 'success'); });
  renderCalendar(); updateSelected(); updateTimes(); renderBookings(); updateMonthlyLimit();
})();
