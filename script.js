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
                if (this.files[0].size > 1048576) {
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

        // 1. التحقق من التكرار
        const cinValue = document.getElementById('numero').value;
        if (localStorage.getItem('registered_cin_' + cinValue)) {
            alert("لقد قمت بالتسجيل مسبقاً بهذا الرقم! (Vous êtes déjà inscrit)");
            return;
        }

        // 2. التحقق من الحقول (Browser validation handles most, but we double check)
        const requiredFields = form.querySelectorAll('[required]');
        let firstInvalid = null;

        requiredFields.forEach(field => {
            if (!field.value || !field.value.trim()) {
                field.style.borderColor = 'var(--error)';
                if (!firstInvalid) firstInvalid = field;
            } else {
                field.style.borderColor = 'var(--border-color)';
            }
        });

        if (firstInvalid) {
            firstInvalid.focus();
            alert("يرجى ملء جميع الخانات المطلوبة (Veuillez remplir tous les champs)");
            return;
        }

        // 3. الإرسال
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span>جاري معالجة طلبك...</span>`;

        try {
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            lastSubmittedData = { ...data };

            // معالجة الصورة
            if (photoInput && photoInput.files[0]) {
                const file = photoInput.files[0];
                const base64 = await toBase64(file);
                data.photoData = base64.split(',')[1];
                data.photoName = file.name;
                data.photoType = file.type;
                lastSubmittedData.fullPhotoBase64 = base64;
            }

            // حفظ نصوص الاختيارات للـ PDF
            const filiereSelect = document.getElementById('filiere');
            lastSubmittedData.filiereText = filiereSelect.options[filiereSelect.selectedIndex].text;
            
            const niveauSelect = document.getElementById('niveau');
            lastSubmittedData.niveauText = niveauSelect.options[niveauSelect.selectedIndex].text;

            // إرسال البيانات (بشكل غير متزامن لعدم تعطيل المستخدم)
            if (SCRIPT_URL && !SCRIPT_URL.includes("URL_HERE")) {
                fetch(SCRIPT_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    cache: 'no-cache',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                }).catch(err => console.error("Fetch error:", err));
            }
            
            // حفظ في الذاكرة المحلية
            localStorage.setItem('registered_cin_' + cinValue, 'true');
            
            // إظهار صفحة النجاح فوراً
            showSuccessPage();

        } catch (error) {
            console.error('Submission error:', error);
            alert("حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.");
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });

    if (downloadPdfBtn) {
        downloadPdfBtn.addEventListener('click', generatePDF);
    }

    function generatePDF() {
        const element = document.getElementById('pdf-template');
        if (!element || !lastSubmittedData) {
            alert('خطأ في استرجاع البيانات. يرجى المحاولة مرة أخرى.');
            return;
        }

        element.style.display = 'block';

        // Fill data
        document.getElementById('pdf-full-name').textContent = (lastSubmittedData.prenom_ar + ' ' + lastSubmittedData.nom_ar) || '';
        document.getElementById('pdf-full-name-fr').textContent = (lastSubmittedData.prenom_fr + ' ' + lastSubmittedData.nom_fr).toUpperCase() || '';
        document.getElementById('pdf-cin').textContent = lastSubmittedData.numero || '';
        document.getElementById('pdf-dob').textContent = lastSubmittedData.date_naissance || '';
        document.getElementById('pdf-phone').textContent = lastSubmittedData.telephone || '';
        document.getElementById('pdf-city').textContent = lastSubmittedData.ville_ar || '';
        document.getElementById('pdf-filiere').textContent = lastSubmittedData.filiereText || '';
        document.getElementById('pdf-niveau').textContent = lastSubmittedData.niveauText || '';
        document.getElementById('pdf-annee-bac').textContent = lastSubmittedData.annee_bac || '-';

        const pdfPhoto = document.getElementById('pdf-photo');
        const pdfPhotoPlaceholder = document.getElementById('pdf-photo-placeholder');

        if (lastSubmittedData.photoData) {
            pdfPhoto.src = lastSubmittedData.photoData;
            pdfPhoto.style.display = 'block';
            if (pdfPhotoPlaceholder) pdfPhotoPlaceholder.style.display = 'none';
        } else {
            pdfPhoto.style.display = 'none';
            if (pdfPhotoPlaceholder) pdfPhotoPlaceholder.style.display = 'block';
        }

        const opt = {
            margin: 0,
            filename: `ECIG_Inscription_${lastSubmittedData.numero || 'Student'}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { 
                scale: 2, 
                useCORS: true, 
                letterRendering: true,
                scrollX: 0,
                scrollY: 0
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(element).save().then(() => {
            element.style.display = 'none';
        }).catch(err => {
            console.error('PDF Error:', err);
            element.style.display = 'none';
            alert('حدث خطأ أثناء تحميل الملف. يرجى التأكد من أن متصفحك يدعم هذه الخاصية.');
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
        document.getElementById('mainContainer').style.display = 'none';
        successSection.classList.remove('hidden');
        window.scrollTo(0, 0);
    }
});
