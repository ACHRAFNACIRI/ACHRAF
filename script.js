document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('registrationForm');
    const successMessage = document.getElementById('successMessage');
    const submitBtn = document.querySelector('.submit-btn');
    const photoInput = document.getElementById('photo');
    const photoError = document.getElementById('photo-error');

    // رابط الـ Web App الخاص بك
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbww_3On2wnJtY6dJ3iPCbSAuSjmgtTgpg2y1Xh441IeZ-JyOMUXZoEGG7T3eaxVQsR1/exec";

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

            // تحويل الصورة إلى Base64 إذا وجدت
            if (photoInput && photoInput.files[0]) {
                const file = photoInput.files[0];
                const base64 = await toBase64(file);
                data.photoData = base64.split(',')[1];
                data.photoName = file.name;
                data.photoType = file.type;
            }

            if (!SCRIPT_URL || SCRIPT_URL.includes("URL_HERE")) {
                alert("يرجى التأكد من وضع رابط Google Apps Script الصحيح.");
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
                return;
            }

            await fetch(SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                cache: 'no-cache',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            showSuccess();

        } catch (error) {
            console.error('Error:', error);
            alert("حدث خطأ أثناء الإرسال. تأكد من إعدادات Google Sheets.");
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });

    function toBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    function showSuccess() {
        successMessage.classList.remove('hidden');
        successMessage.style.opacity = '1';
        form.reset();
        
        setTimeout(() => {
            successMessage.style.opacity = '0';
            setTimeout(() => {
                successMessage.classList.add('hidden');
            }, 300);
        }, 5000);
    }
});
