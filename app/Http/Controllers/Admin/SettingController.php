<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class SettingController extends Controller
{
    // ─── Settings хуудас харуулах ─────────────────────────────────────────────

    public function index(): Response
    {
        $settings = Setting::orderBy('group')->orderBy('id')->get()->map(fn($s) => [
            'id'           => $s->id,
            'key'          => $s->key,
            'value'        => $s->is_sensitive ? '' : $s->value, // нууц утгийг хоосон буцаана
            'group'        => $s->group,
            'label'        => $s->label,
            'description'  => $s->description,
            'type'         => $s->type,
            'is_sensitive' => $s->is_sensitive,
        ]);

        return Inertia::render('admin/settings/index', [
            'settings'          => $settings,
            'google_connected'  => ! empty(config('services.google.refresh_token')),
        ]);
    }

    // ─── Бүлэг хадгалах ──────────────────────────────────────────────────────

    public function update(Request $request): RedirectResponse
    {
        $request->validate([
            'group'    => 'required|string|in:general,payment,email,system,branding',
            'settings' => 'required|array|max:50',
        ]);

        $group = $request->input('group');
        $data  = $request->input('settings', []);

        $keys = Setting::where('group', $group)->pluck('key')->toArray();

        foreach ($data as $key => $value) {
            if (! in_array($key, $keys, true)) {
                continue;
            }

            $setting = Setting::where('key', $key)->first();
            if (! $setting) continue;

            if ($setting->is_sensitive && $value === '') {
                continue;
            }

            $sanitized = match ($setting->type) {
                'integer'  => (string) abs((int) $value),
                'boolean'  => in_array($value, ['true', '1', true, 1], true) ? '1' : '0',
                default    => strip_tags((string) $value),
            };

            $setting->update(['value' => $sanitized]);
        }

        return back()->with('success', $this->groupLabel($group) . ' тохиргоо амжилттай хадгаллаа.');
    }

    // ─── Брэнд (лого, favicon) upload ───────────────────────────────────────

    public function uploadBranding(Request $request): RedirectResponse
    {
        $request->validate([
            'site_logo'    => ['nullable', 'image', 'mimes:jpeg,png,svg,webp', 'max:2048'],
            'site_favicon' => ['nullable', 'image', 'mimes:jpeg,png,ico,webp', 'max:512'],
        ]);

        $uploaded = 0;

        foreach (['site_logo', 'site_favicon'] as $key) {
            if ($request->hasFile($key) && $request->file($key)->isValid()) {
                // Хуучин файлыг устга
                $old = Setting::where('key', $key)->value('value');
                if ($old) {
                    $relative = ltrim(str_replace('/storage/', '', $old), '/');
                    Storage::disk('public')->delete($relative);
                }

                $path = $request->file($key)->store('branding', 'public');
                Setting::updateOrCreate(
                    ['key' => $key],
                    [
                        'value'       => '/storage/' . $path,
                        'group'       => 'branding',
                        'label'       => $key === 'site_logo' ? 'Вэбсайтын лого' : 'Favicon',
                        'description' => $key === 'site_logo'
                            ? 'Навигац болон имэйлд харагдах лого'
                            : 'Хөтчийн таб дахь дүрс',
                        'type'        => 'image',
                        'is_sensitive'=> false,
                    ]
                );
                $uploaded++;
            }
        }

        if ($uploaded === 0) {
            return back()->with('error', 'Файл сонгогдоогүй байна.');
        }

        return back()->with('success', 'Брэндийн зураг амжилттай хадгаллаа.');
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private function groupLabel(string $group): string
    {
        return match ($group) {
            'general'  => 'Ерөнхий',
            'payment'  => 'Төлбөр',
            'email'    => 'Имэйл',
            'system'   => 'Системийн',
            'branding' => 'Брэнд',
            default    => ucfirst($group),
        };
    }
}
