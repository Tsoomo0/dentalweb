<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── Node төрлүүд (message/image/question/action/condition/delay) ──────────
        Schema::table('social_flow_nodes', function (Blueprint $table) {
            $table->string('type')->default('message')->after('flow_id')->index();
            $table->text('image_url')->nullable()->after('body');

            // Линейн дараагийн алхам (товчгүй node-уудад)
            $table->foreignId('next_node_id')->nullable()->after('image_url')->constrained('social_flow_nodes')->nullOnDelete();

            // Question — хариуг хадгалах талбар
            $table->string('save_field')->nullable();

            // Action
            $table->string('action_type')->nullable();   // set_field/add_tag/remove_tag/mark_open/start_flow/unsubscribe
            $table->string('action_field')->nullable();
            $table->string('action_value')->nullable();
            $table->foreignId('action_flow_id')->nullable()->constrained('social_flows')->nullOnDelete();

            // Delay (секунд)
            $table->unsignedInteger('delay_seconds')->nullable();

            // Condition
            $table->string('condition_type')->nullable();  // has_tag/field_equals/field_contains
            $table->string('condition_field')->nullable();
            $table->string('condition_value')->nullable();
            $table->foreignId('yes_node_id')->nullable()->constrained('social_flow_nodes')->nullOnDelete();
            $table->foreignId('no_node_id')->nullable()->constrained('social_flow_nodes')->nullOnDelete();

            // Аналитик
            $table->unsignedInteger('sent_count')->default(0);
        });

        // ── Conversation — question хүлээж буй node ──────────────────────────────
        Schema::table('social_conversations', function (Blueprint $table) {
            $table->foreignId('awaiting_node_id')->nullable()->after('status')->constrained('social_flow_nodes')->nullOnDelete();
        });

        // ── Contact — custom талбар + тэмдэгүүд ──────────────────────────────────
        Schema::table('social_contacts', function (Blueprint $table) {
            $table->json('attributes')->nullable()->after('meta'); // хадгалсан custom талбарууд
            $table->json('tags')->nullable()->after('attributes');
        });

        // ── Message — аналитик ───────────────────────────────────────────────────
        Schema::table('social_messages', function (Blueprint $table) {
            $table->foreignId('flow_node_id')->nullable()->after('social_conversation_id')->constrained('social_flow_nodes')->nullOnDelete();
            $table->timestamp('read_at')->nullable()->after('delivered_at');
        });

        // ── Button — дарсан тоо ──────────────────────────────────────────────────
        Schema::table('social_flow_buttons', function (Blueprint $table) {
            $table->unsignedInteger('click_count')->default(0)->after('url');
        });
    }

    public function down(): void
    {
        Schema::table('social_flow_nodes', function (Blueprint $table) {
            $table->dropConstrainedForeignId('next_node_id');
            $table->dropConstrainedForeignId('action_flow_id');
            $table->dropConstrainedForeignId('yes_node_id');
            $table->dropConstrainedForeignId('no_node_id');
            $table->dropColumn(['type', 'image_url', 'save_field', 'action_type', 'action_field', 'action_value', 'delay_seconds', 'condition_type', 'condition_field', 'condition_value', 'sent_count']);
        });
        Schema::table('social_conversations', function (Blueprint $table) {
            $table->dropConstrainedForeignId('awaiting_node_id');
        });
        Schema::table('social_contacts', function (Blueprint $table) {
            $table->dropColumn(['attributes', 'tags']);
        });
        Schema::table('social_messages', function (Blueprint $table) {
            $table->dropConstrainedForeignId('flow_node_id');
            $table->dropColumn('read_at');
        });
        Schema::table('social_flow_buttons', function (Blueprint $table) {
            $table->dropColumn('click_count');
        });
    }
};
