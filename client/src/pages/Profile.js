import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import { FiArrowLeft, FiCamera, FiSave, FiEdit3 } from 'react-icons/fi';

const Profile = () => {
  const { user, updateProfile, uploadAvatar, changePassword } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm({
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      bio: user?.bio || ''
    }
  });

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: passwordErrors },
    reset: resetPassword,
    watch
  } = useForm();

  const password = watch('newPassword');

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarUpload = async () => {
    if (avatarFile) {
      const result = await uploadAvatar(avatarFile);
      if (result.success) {
        setAvatarFile(null);
        setAvatarPreview(null);
      }
    }
  };

  const onSubmit = async (data) => {
    const result = await updateProfile(data);
    if (result.success) {
      setIsEditing(false);
      reset(data);
    }
  };

  const onSubmitPassword = async (data) => {
    const result = await changePassword(data.currentPassword, data.newPassword);
    if (result.success) {
      setIsChangingPassword(false);
      resetPassword();
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'away':
        return 'bg-yellow-500';
      case 'busy':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <>
      <Helmet>
        <title>Profile - Yapper</title>
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <FiArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-semibold text-gray-900">Profile</h1>
          </div>
        </div>

        <div className="max-w-2xl mx-auto py-8 px-4">
          {/* Avatar Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center space-x-6">
              <div className="relative">
                <img
                  src={avatarPreview || user?.avatar || '/default-avatar.png'}
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
                />
                <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-4 border-white ${getStatusColor(user?.status)}`}></div>
                <label className="absolute bottom-0 right-0 bg-primary-600 text-white p-2 rounded-full cursor-pointer hover:bg-primary-700">
                  <FiCamera size={16} />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </label>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900">{user?.fullName}</h2>
                <p className="text-gray-500">@{user?.username}</p>
                <p className="text-sm text-gray-400 mt-1">Member since {new Date(user?.createdAt).toLocaleDateString()}</p>
                {avatarFile && (
                  <button
                    onClick={handleAvatarUpload}
                    className="mt-2 btn-primary text-sm"
                  >
                    Upload Avatar
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Profile Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Profile Information</h3>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="flex items-center space-x-1 text-primary-600 hover:text-primary-700"
              >
                <FiEdit3 size={16} />
                <span>{isEditing ? 'Cancel' : 'Edit'}</span>
              </button>
            </div>

            {isEditing ? (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      {...register('firstName', { required: 'First name is required' })}
                      className="input-field"
                    />
                    {errors.firstName && (
                      <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      {...register('lastName', { required: 'Last name is required' })}
                      className="input-field"
                    />
                    {errors.lastName && (
                      <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bio
                  </label>
                  <textarea
                    {...register('bio', { maxLength: { value: 500, message: 'Bio must be less than 500 characters' } })}
                    rows={3}
                    className="input-field"
                    placeholder="Tell us about yourself..."
                  />
                  {errors.bio && (
                    <p className="mt-1 text-sm text-red-600">{errors.bio.message}</p>
                  )}
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    <FiSave size={16} className="mr-2" />
                    Save Changes
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name
                    </label>
                    <p className="text-gray-900">{user?.firstName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name
                    </label>
                    <p className="text-gray-900">{user?.lastName}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <p className="text-gray-900">{user?.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bio
                  </label>
                  <p className="text-gray-900">{user?.bio || 'No bio added yet.'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <p className="text-gray-900 capitalize">{user?.status}</p>
                </div>
              </div>
            )}
          </div>

          {/* Change Password */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Change Password</h3>
              <button
                onClick={() => setIsChangingPassword(!isChangingPassword)}
                className="flex items-center space-x-1 text-primary-600 hover:text-primary-700"
              >
                <FiEdit3 size={16} />
                <span>{isChangingPassword ? 'Cancel' : 'Change'}</span>
              </button>
            </div>

            {isChangingPassword ? (
              <form onSubmit={handleSubmitPassword(onSubmitPassword)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    {...registerPassword('currentPassword', { required: 'Current password is required' })}
                    className="input-field"
                  />
                  {passwordErrors.currentPassword && (
                    <p className="mt-1 text-sm text-red-600">{passwordErrors.currentPassword.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    {...registerPassword('newPassword', { 
                      required: 'New password is required',
                      minLength: { value: 6, message: 'Password must be at least 6 characters' }
                    })}
                    className="input-field"
                  />
                  {passwordErrors.newPassword && (
                    <p className="mt-1 text-sm text-red-600">{passwordErrors.newPassword.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    {...registerPassword('confirmPassword', {
                      required: 'Please confirm your password',
                      validate: (value) => value === password || 'Passwords do not match'
                    })}
                    className="input-field"
                  />
                  {passwordErrors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">{passwordErrors.confirmPassword.message}</p>
                  )}
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsChangingPassword(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Change Password
                  </button>
                </div>
              </form>
            ) : (
              <p className="text-gray-500">Click "Change" to update your password.</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Profile;
