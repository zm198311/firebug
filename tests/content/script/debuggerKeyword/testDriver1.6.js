/**
 * Test for debugger; keyword used in various contexts (in a function, in an
 * dynamically evaluated functions, etc.)
 * 
 * The test also verifies  Issue 3082: Disable "debugger;" statements by converting
 * them to conditional breakpoints.
 */
function runTest()
{
    FBTest.sysout("debuggerKeyword.START");

    // Load test case page
    FBTest.openNewTab(basePath + "script/debuggerKeyword/testPage.html",
    function(testWindow)
    {
        // Open Firebug UI, select and enable Script panel.
        FBTest.openFirebug();
        FBTest.clearCache();
        FBTest.selectPanel("script");
        FBTest.enableScriptPanel(function(win)
        {
            var doc = win.document;

            // List of tasks for this test.
            var taskList = new FBTest.TaskList();
            taskList.push(executeTest, doc, "debuggerSimple", 31, true);
            taskList.push(executeTest, doc, "debuggerShallow", 37, true);
            taskList.push(executeTest, doc, "debuggerDeep", 63, true);
            taskList.push(executeTest, doc, "debuggerInXHR", 14, false); // Disable is not supported for XHR.
            taskList.push(executeTest, doc, "debuggerInScript", 16, true);

            // Start all async tasks.
            taskList.run(function() {
                FBTest.testDone("debuggerKeyword.DONE");
            });
        });
    });
}

/**
 * This function check behavior of a debugger keyword.
 * The logic is as follows:
 * 1) Verify that debugger is resumed.
 * 2) Click specified test button (testId)
 * 3) Verify that debugger halted at specified line (lineNo)
 * 4) Press 'Disable' in the balloon dialog.
 * 5) Click specified test button again.
 * 6) Nothing should happen, the debugger must be resumed.
 * 7) Remove a breakpoint that has been created in step #4.
 */
function executeTest(callback, doc, testId, lineNo, disable)
{
    FBTest.progress("TEST: " + testId + " should stop on " + lineNo);

    if (!testResumeState())
        return;

    var chrome = FW.Firebug.chrome;
    FBTest.waitForBreakInDebugger(chrome, lineNo, false, function(row)
    {
        // Don't disable if the test says so. 
        if (!disable)
        {
            FBTest.clickContinueButton();
            callback();
            return;
        }

        if (!clickDisableButton())
            return;

        FBTest.click(doc.getElementById(testId));

        setTimeout(function()
        {
            if (testResumeState())
            {
                FW.Firebug.Debugger.clearAllBreakpoints(null);
                callback();
            }
        });
    });

    // Execute a method with debuggger; keyword in it. This is done
    // asynchronously since it stops the execution context.
    FBTest.click(doc.getElementById(testId));
}

function testResumeState()
{
    var chrome = FW.Firebug.chrome;
    var stopped = chrome.getGlobalAttribute("fbDebuggerButtons", "stopped");
    if (!FBTest.compare("false", stopped, "The debugger must be resumed by now"))
    {
        FBTest.testDone("debuggerKeyword.FAIL");
        return false;
    }
    return true;
}

function clickDisableButton()
{
    var panel = FBTest.getPanel("script");
    var button = panel.panelNode.querySelector(".notificationButton.skipButton");
    if (!FBTest.ok(button, "There must be a balloon with 'Disable' button."))
    {
        FBTest.testDone("debuggerKeyword.FAIL");
        return false;
    }

    FBTest.click(button);
    return true;
}
