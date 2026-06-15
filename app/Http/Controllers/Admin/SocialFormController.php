<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Social\SocialForm;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SocialFormController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/Social/Forms', [
            'forms' => SocialForm::query()->orderByDesc('id')->get()->map(fn (SocialForm $f) => [
                'id' => $f->id,
                'name' => $f->name,
                'description' => $f->description,
                'fields' => $f->fields ?? [],
                'success_message' => $f->success_message,
                'notify_emails' => $f->notify_emails ?? [],
                'is_active' => $f->is_active,
                'submissions_count' => $f->submissions_count,
            ]),
            // Мэдэгдэл явуулах боломжит админууд
            'admins' => User::query()
                ->whereHas('role', fn ($q) => $q->where('name', 'admin'))
                ->whereNotNull('email')
                ->orderBy('name')
                ->get(['id', 'name', 'email'])
                ->map(fn (User $u) => ['id' => $u->id, 'name' => $u->name, 'email' => $u->email]),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $form = SocialForm::create($this->validated($request) + ['created_by' => $request->user()?->id]);

        return back()->with('success', 'Форм үүсгэлээ.')->with('new_form_id', $form->id);
    }

    public function update(SocialForm $form, Request $request): RedirectResponse
    {
        $form->update($this->validated($request));

        return back()->with('success', 'Форм шинэчлэгдлээ.');
    }

    public function destroy(SocialForm $form): RedirectResponse
    {
        $form->delete();

        return back()->with('success', 'Форм устгагдлаа.');
    }

    /** Тухайн формын ирсэн хариултууд. */
    public function submissions(SocialForm $form): JsonResponse
    {
        return response()->json([
            'submissions' => $form->submissions()->with('contact')->latest('id')->limit(200)->get()->map(fn ($s) => [
                'id' => $s->id,
                'contact' => $s->contact?->name ?? $s->contact?->username,
                'data' => $s->data,
                'submitted_at' => $s->submitted_at?->toDateTimeString(),
            ]),
        ]);
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'name' => 'required|string|max:120',
            'description' => 'nullable|string|max:300',
            'fields' => 'required|array|min:1',
            'fields.*.key' => 'required|string|max:60',
            'fields.*.label' => 'required|string|max:120',
            'fields.*.type' => 'required|in:text,email,phone,number,textarea,select',
            'fields.*.required' => 'boolean',
            'fields.*.options' => 'nullable|array',
            'success_message' => 'nullable|string|max:300',
            'notify_emails' => 'nullable|array|max:10',
            'notify_emails.*' => 'email|max:190',
            'is_active' => 'boolean',
        ]);
    }
}
