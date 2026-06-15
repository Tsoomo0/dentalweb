<?php

namespace App\Http\Controllers\Social;

use App\Events\Social\SocialMessageReceived;
use App\Http\Controllers\Controller;
use App\Mail\SocialFormSubmittedMail;
use App\Models\Social\SocialContact;
use App\Models\Social\SocialConversation;
use App\Models\Social\SocialForm;
use App\Models\Social\SocialFormSubmission;
use App\Models\Social\SocialMessage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Олон нийтэд нээлттэй вэбформ — товч дарж хэрэглэгч энд бөглөнө.
 */
class PublicFormController extends Controller
{
    public function show(SocialForm $form, Request $request): Response
    {
        abort_unless($form->is_active, 404);

        return Inertia::render('PublicSocialForm', [
            'form' => $this->formData($form),
            'ctx' => ['c' => $request->query('c'), 'conv' => $request->query('conv'), 't' => $request->query('t')],
            'submitted' => false,
            'success' => null,
        ]);
    }

    public function submit(SocialForm $form, Request $request): Response|RedirectResponse
    {
        abort_unless($form->is_active, 404);

        // Талбар бүрээр динамик validation
        $rules = ['data' => 'required|array'];
        foreach ($form->fields ?? [] as $f) {
            $r = [($f['required'] ?? false) ? 'required' : 'nullable'];
            $r[] = match ($f['type'] ?? 'text') {
                'email' => 'email',
                'number' => 'numeric',
                default => 'string',
            };
            $r[] = 'max:2000';
            $rules['data.'.$f['key']] = implode('|', $r);
        }

        $validated = $request->validate($rules + [
            'c' => 'nullable|integer',
            'conv' => 'nullable|integer',
            't' => 'nullable|string',
        ]);

        $data = $validated['data'];

        // Токен зөв бол контакт/харилцаатай холбоно.
        $contactId = (int) ($request->input('c') ?? 0);
        $convId = (int) ($request->input('conv') ?? 0);
        $linked = $contactId && $request->input('t') === SocialForm::token($form->id, $contactId);

        $contact = $linked ? SocialContact::find($contactId) : null;
        $conversation = $linked ? SocialConversation::find($convId) : null;

        $submission = SocialFormSubmission::create([
            'social_form_id' => $form->id,
            'social_contact_id' => $contact?->id,
            'social_conversation_id' => $conversation?->id,
            'data' => $data,
            'submitted_at' => now(),
        ]);
        $form->increment('submissions_count');

        // Тохируулсан имэйл рүү мэдэгдэл явуулна.
        $emails = array_filter($form->notify_emails ?? []);
        if ($emails) {
            try {
                Mail::to($emails)->send(new SocialFormSubmittedMail($form, $submission->load('contact')));
            } catch (\Throwable $e) {
                Log::warning('Social form notify email failed', ['form' => $form->id, 'error' => $e->getMessage()]);
            }
        }

        // Контактын мэдээлэлд хадгална.
        if ($contact) {
            $attrs = $contact->attributes ?? [];
            foreach ($data as $k => $v) {
                $attrs[$k] = $v;
            }
            $contact->update(['attributes' => $attrs]);
        }

        // Харилцаанд хариуг буцааж (inbox-д харагдана).
        if ($conversation) {
            $lines = ["📋 «{$form->name}» форм бөглөв:"];
            foreach ($form->fields ?? [] as $f) {
                $val = $data[$f['key']] ?? '';
                if ($val !== '' && $val !== null) {
                    $lines[] = "• {$f['label']}: {$val}";
                }
            }
            $msg = SocialMessage::create([
                'social_conversation_id' => $conversation->id,
                'direction' => SocialMessage::DIR_IN,
                'sender' => SocialMessage::SENDER_CONTACT,
                'type' => 'text',
                'text' => implode("\n", $lines),
                'delivered_at' => now(),
            ]);
            $conversation->update([
                'last_message_text' => "📋 {$form->name} бөглөв",
                'last_message_at' => now(),
                'status' => SocialConversation::STATUS_OPEN,
                'unread_count' => ($conversation->unread_count ?? 0) + 1,
            ]);
            try {
                broadcast(new SocialMessageReceived($msg));
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning('Social form broadcast failed', ['error' => $e->getMessage()]);
            }
        }

        return Inertia::render('PublicSocialForm', [
            'form' => $this->formData($form),
            'ctx' => [],
            'submitted' => true,
            'success' => $form->success_message ?: 'Баярлалаа! Таны хариуг хүлээн авлаа. ✅',
        ]);
    }

    private function formData(SocialForm $form): array
    {
        return [
            'id' => $form->id,
            'name' => $form->name,
            'description' => $form->description,
            'fields' => $form->fields ?? [],
        ];
    }
}
