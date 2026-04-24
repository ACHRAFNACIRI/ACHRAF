document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('registrationForm');
    const successSection = document.getElementById('successSection');
    const submitBtn = document.querySelector('.submit-btn');
    const photoInput = document.getElementById('photo');
    const photoError = document.getElementById('photo-error');
    const downloadPdfBtn = document.getElementById('downloadPdfBtn');

    // رابط الـ Web App الخاص بك
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbww_3On2wnJtY6dJ3iPCbSAuSjmgtTgpg2y1Xh441IeZ-JyOMUXZoEGG7T3eaxVQsR1/exec";

    let lastSubmittedData = null;

    // التحقق من حجم الصورة
    if (photoInput) {
        photoInput.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                if (this.files[0].size > 1048576) { // 1 MB = 1048576 bytes
                    photoError.style.display = 'block';
                    this.value = ''; 
                    this.style.borderColor = 'var(--error)';
                } else {
                    photoError.style.display = 'none';
                    this.style.borderColor = 'var(--border-color)';
                }
            }
        });
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // التحقق مما إذا كان المستخدم مسجلاً مسبقاً في هذا الجهاز
        const cinValue = document.getElementById('numero').value;
        if (localStorage.getItem('registered_cin_' + cinValue)) {
            alert("لقد قمت بالتسجيل مسبقاً بهذا الرقم! (Vous êtes déjà inscrit)");
            return;
        }

        // التحقق من الحقول المطلوبة
        let isValid = true;
        const requiredFields = form.querySelectorAll('[required]');
        
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                isValid = false;
                field.style.borderColor = 'var(--error)';
            } else {
                field.style.borderColor = 'var(--border-color)';
            }
        });

        if (!isValid) return;

        // تغيير حالة الزر إلى "جاري الإرسال"
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span>جاري الإرسال...</span>`;

        try {
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            lastSubmittedData = data;

            // تحويل الصورة إلى Base64 إذا وجدت
            if (photoInput && photoInput.files[0]) {
                const file = photoInput.files[0];
                const base64 = await toBase64(file);
                data.photoData = base64.split(',')[1];
                data.photoName = file.name;
                data.photoType = file.type;
                lastSubmittedData.fullPhotoBase64 = base64;
            }

            // حفظ نص الشعبة المختار قبل الإرسال
            const filiereSelect = document.getElementById('filiere');
            lastSubmittedData.filiereText = filiereSelect.options[filiereSelect.selectedIndex].text;

            if (!SCRIPT_URL || SCRIPT_URL.includes("URL_HERE")) {
                console.warn("رابط Google Script غير مفعل.");
            } else {
                await fetch(SCRIPT_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    cache: 'no-cache',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
            }
            
            // حفظ رقم البطاقة في الذاكرة المحلية
            localStorage.setItem('registered_cin_' + cinValue, 'true');
            
            showSuccessPage();

        } catch (error) {
            console.error('Error:', error);
            alert("حدث خطأ أثناء الإرسال. تأكد من إعدادات Google Sheets.");
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });

    // وظيفة تحميل الـ PDF
    if (downloadPdfBtn) {
        downloadPdfBtn.addEventListener('click', () => {
            if (!lastSubmittedData) return;

            // ملء بيانات القالب
            document.getElementById('pdf-full-name').textContent = `${lastSubmittedData.prenom_ar} ${lastSubmittedData.nom_ar}`;
            document.getElementById('pdf-full-name-fr').textContent = `${lastSubmittedData.prenom_fr} ${lastSubmittedData.nom_fr}`;
            document.getElementById('pdf-cin').textContent = lastSubmittedData.numero;
            document.getElementById('pdf-dob').textContent = lastSubmittedData.date_naissance;
            document.getElementById('pdf-phone').textContent = lastSubmittedData.telephone;
            document.getElementById('pdf-city').textContent = lastSubmittedData.ville_ar;
            document.getElementById('pdf-filiere').textContent = lastSubmittedData.filiereText;
            
            const niveauSelect = document.getElementById('niveau');
            const niveauText = niveauSelect.options[niveauSelect.selectedIndex].text;
            document.getElementById('pdf-niveau').textContent = niveauText;

            // إضافة الصورة للـ PDF
            const pdfPhoto = document.getElementById('pdf-photo');
            const pdfPhotoPlaceholder = document.getElementById('pdf-photo-placeholder');
            if (lastSubmittedData.fullPhotoBase64) {
                pdfPhoto.src = lastSubmittedData.fullPhotoBase64;
                pdfPhoto.style.display = 'block';
                pdfPhotoPlaceholder.style.display = 'none';
            } else {
                pdfPhoto.style.display = 'none';
                pdfPhotoPlaceholder.style.display = 'block';
            }

            const element = document.getElementById('pdf-template');
            element.style.display = 'block';

            const opt = {
                margin:       0.5,
                filename:     `Inscription_${lastSubmittedData.nom_fr}.pdf`,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2, useCORS: true },
                jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
            };

            html2pdf().set(opt).from(element).save().then(() => {
                element.style.display = 'none';
            });
        });
    }

    function toBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    function showSuccessPage() {
        // إخفاء المحتوى الرئيسي وإظهار صفحة النجاح
        document.querySelector('.container').style.display = 'none';
        successSection.classList.remove('hidden');
        window.scrollTo(0, 0);
    }
});
