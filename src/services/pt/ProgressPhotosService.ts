import { supabase } from '../../db/supabase';
import { ProgressPhoto, PhotoAngle } from '../../../shared/types';

const BUCKET = 'progress-photos';

// Compress image client-side before upload
async function compressImage(file: File, maxWidth = 1200, quality = 0.8): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => resolve(blob ?? file),
        'image/jpeg',
        quality,
      );
    };
    img.src = URL.createObjectURL(file);
  });
}

export const ProgressPhotosService = {
  async getByStudent(studentId: string): Promise<ProgressPhoto[]> {
    const { data, error } = await supabase
      .from('progress_photos')
      .select('*')
      .eq('student_id', studentId)
      .order('photo_date', { ascending: false });

    if (error) throw error;
    return data ?? [];
  },

  async upload(params: {
    gymId: string;
    studentId: string;
    file: File;
    angle: PhotoAngle;
    photoDate: string;
    notes?: string;
  }): Promise<ProgressPhoto> {
    const { gymId, studentId, file, angle, photoDate, notes } = params;

    // Compress before upload
    const compressed = await compressImage(file);
    const ext = 'jpg';
    const filename = `${Date.now()}_${angle}.${ext}`;
    const storagePath = `${gymId}/${studentId}/${filename}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, compressed, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(storagePath);

    // Save metadata to DB
    const { data, error } = await supabase
      .from('progress_photos')
      .insert([{
        gym_id: gymId,
        student_id: studentId,
        photo_date: photoDate,
        storage_path: storagePath,
        photo_url: urlData.publicUrl,
        angle,
        notes: notes || null,
      }])
      .select('*')
      .single();

    if (error) throw error;
    return data;
  },

  async delete(photo: ProgressPhoto): Promise<void> {
    // Delete from storage
    await supabase.storage
      .from(BUCKET)
      .remove([photo.storage_path]);

    // Delete from DB
    const { error } = await supabase
      .from('progress_photos')
      .delete()
      .eq('id', photo.id);

    if (error) throw error;
  },
};
