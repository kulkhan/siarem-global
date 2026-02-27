import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { X, Ship, Phone, MapPin, Clock, Users, CalendarCheck } from 'lucide-react';
import { meetingsApi } from '@/api/meetings';

interface Props {
  meetingId: string;
  onClose: () => void;
  onEdit: () => void;
}

const TYPE_COLORS: Record<string, string> = {
  MEETING: 'bg-blue-100 text-blue-700',
  CALL: 'bg-purple-100 text-purple-700',
};

export default function MeetingDetailDrawer({ meetingId, onClose, onEdit }: Props) {
  const { t } = useTranslation();

  const { data: meeting, isLoading } = useQuery({
    queryKey: ['meeting-detail', meetingId],
    queryFn: () => meetingsApi.getOne(meetingId).then((r) => r.data.data),
    enabled: !!meetingId,
  });

  return (
    <div className="fixed inset-0 z-40 flex justify-end pointer-events-none">
      <div className="absolute inset-0 bg-black/20 pointer-events-auto" onClick={onClose} />

      <div className="relative w-[480px] max-w-full h-full bg-white shadow-2xl flex flex-col pointer-events-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gray-50 shrink-0">
          <h2 className="text-base font-semibold text-gray-800">{t('meetings.detail')}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 font-medium text-gray-700"
            >
              {t('common.edit')}
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-md text-gray-500">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {isLoading || !meeting ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            {t('common.loading')}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* Title + type */}
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="text-base font-bold text-gray-900 leading-snug">{meeting.title}</div>
                  {meeting.createdBy && (
                    <div className="text-xs text-gray-400 mt-0.5">
                      {t('meetings.fields.createdBy')}: {meeting.createdBy.name}
                    </div>
                  )}
                </div>
                <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${TYPE_COLORS[meeting.meetingType] ?? 'bg-gray-100 text-gray-600'}`}>
                  {meeting.meetingType === 'CALL'
                    ? <Phone className="w-3 h-3" />
                    : <Users className="w-3 h-3" />
                  }
                  {t(`meetings.type.${meeting.meetingType}`)}
                </span>
              </div>
            </div>

            {/* Customer + Ship */}
            <div className="px-5 py-3 border-b border-gray-100 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500 w-24 shrink-0 text-xs">{t('meetings.fields.customer')}</span>
                <span className="font-medium text-gray-800">{meeting.customer?.name ?? '—'}</span>
                <span className="text-gray-400 text-xs">({meeting.customer?.shortCode})</span>
              </div>
              {meeting.ship && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500 w-24 shrink-0 text-xs">{t('meetings.fields.ship')}</span>
                  <span className="flex items-center gap-1 text-xs text-gray-700">
                    <Ship className="w-3 h-3 text-gray-400" />
                    {meeting.ship.name}
                    {meeting.ship.imoNumber && (
                      <span className="font-mono text-gray-400">({meeting.ship.imoNumber})</span>
                    )}
                  </span>
                </div>
              )}
            </div>

            {/* Date + location/duration */}
            <div className="px-5 py-3 border-b border-gray-100">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                    {t('meetings.fields.date')}
                  </div>
                  <div className="text-sm text-gray-700 mt-0.5 flex items-center gap-1">
                    <CalendarCheck className="w-3.5 h-3.5 text-gray-400" />
                    {new Date(meeting.meetingDate).toLocaleDateString('tr-TR')}
                  </div>
                </div>
                {meeting.followUpDate && (
                  <div>
                    <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                      {t('meetings.fields.followUpDate')}
                    </div>
                    <div className="text-sm text-gray-700 mt-0.5">
                      {new Date(meeting.followUpDate).toLocaleDateString('tr-TR')}
                    </div>
                  </div>
                )}
                {meeting.meetingType === 'MEETING' && meeting.location && (
                  <div>
                    <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                      {t('meetings.fields.location')}
                    </div>
                    <div className="text-sm text-gray-700 mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      {meeting.location}
                    </div>
                  </div>
                )}
                {meeting.meetingType === 'CALL' && meeting.duration && (
                  <div>
                    <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                      {t('meetings.fields.duration')}
                    </div>
                    <div className="text-sm text-gray-700 mt-0.5 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      {meeting.duration} {t('meetings.minutes')}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Attendees */}
            {meeting.attendees && (
              <div className="px-5 py-3 border-b border-gray-100">
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
                  {t('meetings.fields.attendees')}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {meeting.attendees.split(',').map((a, i) => (
                    <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {a.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {meeting.description && (
              <div className="px-5 py-3 border-b border-gray-100">
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
                  {t('meetings.fields.description')}
                </div>
                <div className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">{meeting.description}</div>
              </div>
            )}

            {/* Notes */}
            {meeting.notes && (
              <div className="px-5 py-3">
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
                  {t('meetings.fields.notes')}
                </div>
                <div className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">{meeting.notes}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
